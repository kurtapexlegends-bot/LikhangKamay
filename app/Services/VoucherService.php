<?php

namespace App\Services;

use App\Models\FollowedShop;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\Voucher;
use App\Models\VoucherRedemption;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class VoucherService
{
    /**
     * Validate a voucher code for a buyer and checkout subtotals.
     *
     * @param  string  $code
     * @param  User  $buyer
     * @param  array<string|int, float>  $subtotalsBySeller
     * @param  int|null  $targetShopId
     * @param  bool  $forUpdate
     * @param  array|\Illuminate\Support\Collection  $cartItems
     * @return array<string, mixed>
     */
    public function validateVoucher(
        string $code,
        User $buyer,
        array $subtotalsBySeller,
        ?int $targetShopId = null,
        bool $forUpdate = false,
        array|\Illuminate\Support\Collection $cartItems = [],
        bool $includeModel = false
    ): array {
        if ($cartItems instanceof \Illuminate\Support\Collection) {
            $cartItems = $cartItems->all();
        }
        $cartItems = $this->enrichCartItems($cartItems);
        $normalizedCode = strtoupper(trim($code));

        if ($normalizedCode === '') {
            throw ValidationException::withMessages([
                'voucher_code' => 'Please enter a valid promo code.',
            ]);
        }

        $query = Voucher::with(['shop' => fn ($q) => $q->withTrashed()->select('id', 'name', 'shop_name', 'premium_tier', 'subscription_expires_at', 'pending_downgrade_tier')])
            ->where('code', $normalizedCode);

        if ($forUpdate) {
            $query->lockForUpdate();
        }

        /** @var Voucher|null $voucher */
        $voucher = $query->first();

        if (!$voucher || !$voucher->is_active) {
            throw ValidationException::withMessages([
                'voucher_code' => "Promo code '{$normalizedCode}' is invalid or inactive.",
            ]);
        }

        $now = now();

        if ($voucher->starts_at !== null && $voucher->starts_at->isFuture()) {
            throw ValidationException::withMessages([
                'voucher_code' => "Promo code '{$normalizedCode}' is not yet active (starts " . $voucher->starts_at->format('M d, Y') . ').',
            ]);
        }

        if ($voucher->expires_at !== null && $voucher->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'voucher_code' => "Promo code '{$normalizedCode}' has expired.",
            ]);
        }

        if ($voucher->usage_limit_total !== null && (int) $voucher->used_count >= (int) $voucher->usage_limit_total) {
            throw ValidationException::withMessages([
                'voucher_code' => "Promo code '{$normalizedCode}' has reached its maximum redemption limit.",
            ]);
        }

        if ($voucher->usage_limit_per_user !== null) {
            $userRedemptionsCount = VoucherRedemption::where('voucher_id', $voucher->id)
                ->where('user_id', $buyer->id)
                ->where('status', VoucherRedemption::STATUS_REDEEMED)
                ->count();

            if ($userRedemptionsCount >= (int) $voucher->usage_limit_per_user) {
                throw ValidationException::withMessages([
                    'voucher_code' => "You have already redeemed promo code '{$normalizedCode}' the maximum number of times.",
                ]);
            }
        }

        if (!$voucher->isShopVoucher()) {
            throw ValidationException::withMessages([
                'voucher_code' => "Promo code '{$normalizedCode}' is invalid or inactive.",
            ]);
        }

        $shopKey = (string) $voucher->shop_id;
        $shopName = $voucher->shop?->shop_name ?: ($voucher->shop?->name ?: 'this workshop');

        if ((int) $buyer->id === (int) $voucher->shop_id || (int) ($buyer->seller_owner_id ?? 0) === (int) $voucher->shop_id) {
            throw ValidationException::withMessages([
                'voucher_code' => "Workshop members cannot redeem promo codes issued by their own workshop.",
            ]);
        }

        if ($targetShopId !== null && (int) $voucher->shop_id !== (int) $targetShopId) {
            throw ValidationException::withMessages([
                'voucher_code' => "Promo code '{$normalizedCode}' is only valid for {$shopName}.",
            ]);
        }

        if (!array_key_exists($shopKey, $subtotalsBySeller)) {
            throw ValidationException::withMessages([
                'voucher_code' => "Promo code '{$normalizedCode}' only applies to items from {$shopName}.",
            ]);
        }

        // 1. Audience verification (Shopee / Lazada / TikTok style)
        if ($voucher->target_audience === Voucher::AUDIENCE_FOLLOWERS) {
            $isFollower = FollowedShop::where('user_id', $buyer->id)
                ->where('shop_id', $voucher->shop_id)
                ->exists();
            if (!$isFollower) {
                throw ValidationException::withMessages([
                    'voucher_code' => "Promo code '{$normalizedCode}' is exclusive to followers of {$shopName}. Follow this workshop to unlock.",
                ]);
            }
        } elseif ($voucher->target_audience === Voucher::AUDIENCE_NEW_CUSTOMERS) {
            $hasPriorOrder = Order::where('user_id', $buyer->id)
                ->where('artisan_id', $voucher->shop_id)
                ->whereNotIn('status', [Order::STATUS_CANCELLED, Order::STATUS_REJECTED])
                ->exists();
            if ($hasPriorOrder) {
                throw ValidationException::withMessages([
                    'voucher_code' => "Promo code '{$normalizedCode}' is exclusively for first-time shoppers of {$shopName}.",
                ]);
            }
        } elseif ($voucher->target_audience === Voucher::AUDIENCE_REPEAT_CUSTOMERS) {
            $hasPriorOrder = Order::where('user_id', $buyer->id)
                ->where('artisan_id', $voucher->shop_id)
                ->whereNotIn('status', [Order::STATUS_CANCELLED, Order::STATUS_REJECTED])
                ->exists();
            if (!$hasPriorOrder) {
                throw ValidationException::withMessages([
                    'voucher_code' => "Promo code '{$normalizedCode}' is reserved for returning customers of {$shopName}.",
                ]);
            }
        }

        // 2. Product scope & qualifying items
        $shopRawSubtotal = (float) ($subtotalsBySeller[$shopKey] ?? 0.0);
        $applicableSubtotal = $shopRawSubtotal;
        $qualifyingQuantity = 1;

        $shopItems = !empty($cartItems)
            ? array_values(array_filter($cartItems, function ($it) use ($voucher) {
                $sellerId = $it['artisan_id'] ?? $it['seller_id'] ?? null;
                $qty = (int) ($it['qty'] ?? 1);
                return $qty > 0 && ($sellerId === null || (int) $sellerId === (int) $voucher->shop_id);
            }))
            : [];

        if ($voucher->scope_type !== Voucher::SCOPE_ALL && empty($shopItems)) {
            throw ValidationException::withMessages([
                'voucher_code' => "Promo code '{$normalizedCode}' requires qualifying items from {$shopName}.",
            ]);
        }

        if (!empty($shopItems)) {
            $qualifyingItems = $this->filterQualifyingItems($voucher, $shopItems);
            if (empty($qualifyingItems)) {
                $scopeDesc = $voucher->scope_type === Voucher::SCOPE_CATEGORY
                    ? "items in category '{$voucher->applicable_category}'"
                    : "selected promotional items";
                throw ValidationException::withMessages([
                    'voucher_code' => "Promo code '{$normalizedCode}' only applies to {$scopeDesc} from {$shopName}.",
                ]);
            }

            $applicableSubtotal = (float) array_sum(array_map(fn ($it) => ((float) ($it['price'] ?? 0)) * max(0, (int) ($it['qty'] ?? 1)), $qualifyingItems));
            $qualifyingQuantity = (int) array_sum(array_map(fn ($it) => max(0, (int) ($it['qty'] ?? 1)), $qualifyingItems));
        }

        // 3. Minimum requirements check (Spend vs Quantity)
        if ($voucher->min_requirement_type === Voucher::REQ_QUANTITY) {
            $minQty = max(1, (int) $voucher->min_quantity);
            if ($qualifyingQuantity < $minQty) {
                $needed = $minQty - $qualifyingQuantity;
                throw ValidationException::withMessages([
                    'voucher_code' => "Minimum {$minQty} qualifying item(s) from {$shopName} required (add {$needed} more).",
                ]);
            }
        } else {
            $minSpend = (float) $voucher->min_spend;
            if ($applicableSubtotal < $minSpend) {
                $shortfall = number_format($minSpend - $applicableSubtotal, 2);
                throw ValidationException::withMessages([
                    'voucher_code' => "Minimum spend of PHP " . number_format($minSpend, 2) . " from {$shopName} required (add PHP {$shortfall} more).",
                ]);
            }
        }

        $discountAmount = $this->calculateDiscount($voucher, $applicableSubtotal);

        return $this->formatVoucherSummary($voucher, $discountAmount, true, 0.0, $includeModel);
    }

    /**
     * Enrich cart items with authoritative Product pricing, category, and seller ID from DB.
     *
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    private function enrichCartItems(array $items): array
    {
        if (empty($items)) {
            return [];
        }

        $productIdsToFetch = [];
        foreach ($items as $it) {
            $id = (int) ($it['id'] ?? $it['product_id'] ?? 0);
            if ($id > 0) {
                $productIdsToFetch[] = $id;
            }
        }

        if (empty($productIdsToFetch)) {
            return $items;
        }

        $products = Product::with('discounts')
            ->whereIn('id', array_values(array_unique($productIdsToFetch)))
            ->get()
            ->keyBy('id');

        return array_map(function ($it) use ($products) {
            $id = (int) ($it['id'] ?? $it['product_id'] ?? 0);
            $product = $products->get($id);
            if (!$product) {
                return [
                    'id' => $id,
                    'artisan_id' => null,
                    'category' => null,
                    'price' => 0.0,
                    'qty' => 0,
                ];
            }

            $qty = max(0, (int) ($it['qty'] ?? 1));
            $effectiveQty = max(1, $qty);
            $lineTotal = $product->is_b2b_supply
                ? ($product->getEffectiveB2BPrice($effectiveQty) * $effectiveQty)
                : $product->calculateTotalPriceForQuantity($effectiveQty);

            $it['artisan_id'] = $product->artisan_id ?? $product->user_id;
            $it['category'] = $product->category;
            $it['price'] = round($lineTotal / $effectiveQty, 2);
            $it['qty'] = $qty;

            return $it;
        }, $items);
    }

    /**
     * Filter cart items that match voucher product or category scope.
     *
     * @param  Voucher  $voucher
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, array<string, mixed>>
     */
    public function filterQualifyingItems(Voucher $voucher, array $items): array
    {
        if ($voucher->scope_type === Voucher::SCOPE_SPECIFIC_PRODUCTS) {
            $allowedIds = array_map('intval', (array) ($voucher->applicable_products ?: []));
            return array_values(array_filter($items, fn ($it) => in_array((int) ($it['id'] ?? $it['product_id'] ?? 0), $allowedIds, true)));
        }

        if ($voucher->scope_type === Voucher::SCOPE_CATEGORY && !empty($voucher->applicable_category)) {
            $cat = trim((string) $voucher->applicable_category);
            return array_values(array_filter($items, fn ($it) => strcasecmp(trim((string) ($it['category'] ?? '')), $cat) === 0));
        }

        return $items;
    }

    /**
     * Calculate PHP discount amount for an applicable subtotal.
     */
    public function calculateDiscount(Voucher $voucher, float $applicableSubtotal): float
    {
        if ($applicableSubtotal <= 0) {
            return 0.00;
        }

        if ($voucher->min_requirement_type !== Voucher::REQ_QUANTITY && $applicableSubtotal < (float) $voucher->min_spend) {
            return 0.00;
        }

        if ($voucher->discount_type === Voucher::TYPE_PERCENTAGE) {
            $discount = round($applicableSubtotal * ((float) $voucher->discount_value / 100.0), 2);
            if ($voucher->max_discount !== null && (float) $voucher->max_discount > 0) {
                $discount = min($discount, (float) $voucher->max_discount);
            }
        } else {
            $discount = (float) $voucher->discount_value;
        }

        return round(min(max(0.0, $discount), $applicableSubtotal), 2);
    }

    /**
     * Fetch all public claimable workshop vouchers for the Checkout Voucher Drawer.
     *
     * @param  User|null  $buyer
     * @param  array<string|int, float>  $subtotalsBySeller
     * @param  array|\Illuminate\Support\Collection  $checkoutItems
     * @return array{shops: array<string, array<int, array<string, mixed>>>}
     */
    public function getAvailableVouchersForCheckout(
        ?User $buyer,
        array $subtotalsBySeller,
        array|\Illuminate\Support\Collection $checkoutItems = []
    ): array {
        if ($checkoutItems instanceof \Illuminate\Support\Collection) {
            $checkoutItems = $checkoutItems->all();
        }
        $checkoutItems = $this->enrichCartItems($checkoutItems);

        if (!rescue(fn () => Schema::hasTable('vouchers'), false)) {
            return ['shops' => []];
        }

        $sellerIds = array_values(array_filter(array_map('intval', array_keys($subtotalsBySeller))));

        if (empty($sellerIds)) {
            return ['shops' => []];
        }

        $vouchers = Voucher::with(['shop' => fn ($q) => $q->withTrashed()->select('id', 'name', 'shop_name', 'premium_tier', 'subscription_expires_at', 'pending_downgrade_tier')])
            ->active()
            ->public()
            ->whereIn('shop_id', $sellerIds)
            ->orderByDesc('discount_value')
            ->get();

        $userRedemptionCounts = [];
        $priorOrderCountsBySeller = [];
        $followedShopIds = [];
        if ($buyer && $vouchers->isNotEmpty()) {
            $userRedemptionCounts = VoucherRedemption::where('user_id', $buyer->id)
                ->whereIn('voucher_id', $vouchers->pluck('id')->all())
                ->where('status', VoucherRedemption::STATUS_REDEEMED)
                ->selectRaw('voucher_id, COUNT(*) as redeemed_total')
                ->groupBy('voucher_id')
                ->pluck('redeemed_total', 'voucher_id')
                ->all();

            $priorOrderCountsBySeller = Order::where('user_id', $buyer->id)
                ->whereIn('artisan_id', $sellerIds)
                ->whereNotIn('status', [Order::STATUS_CANCELLED, Order::STATUS_REJECTED])
                ->selectRaw('artisan_id, COUNT(*) as orders_count')
                ->groupBy('artisan_id')
                ->pluck('orders_count', 'artisan_id')
                ->all();

            $followedShopIds = FollowedShop::where('user_id', $buyer->id)
                ->whereIn('shop_id', $sellerIds)
                ->pluck('shop_id')
                ->map(fn ($id) => (int) $id)
                ->all();
        }

        $shopVouchers = [];

        foreach ($vouchers as $voucher) {
            $userUsed = (int) ($userRedemptionCounts[$voucher->id] ?? 0);
            $exhaustedByUser = $voucher->usage_limit_per_user !== null && $userUsed >= (int) $voucher->usage_limit_per_user;
            $isOwnShop = $buyer && ((int) $buyer->id === (int) $voucher->shop_id || (int) ($buyer->seller_owner_id ?? 0) === (int) $voucher->shop_id);

            if ($exhaustedByUser || $isOwnShop || !$voucher->isShopVoucher()) {
                continue;
            }

            $shopKey = (string) $voucher->shop_id;
            $shopSubtotal = (float) ($subtotalsBySeller[$shopKey] ?? 0.0);
            $priorOrders = (int) ($priorOrderCountsBySeller[$voucher->shop_id] ?? 0);
            $isFollower = in_array((int) $voucher->shop_id, $followedShopIds, true);

            // Filter qualifying items if cart items passed
            $shopItems = array_values(array_filter($checkoutItems, function ($it) use ($voucher) {
                $sellerId = $it['artisan_id'] ?? $it['seller_id'] ?? null;
                $qty = (int) ($it['qty'] ?? 1);
                return $qty > 0 && ($sellerId === null || (int) $sellerId === (int) $voucher->shop_id);
            }));

            $qualifyingItems = !empty($shopItems) ? $this->filterQualifyingItems($voucher, $shopItems) : [];
            $applicableSubtotal = !empty($shopItems)
                ? (float) array_sum(array_map(fn ($it) => ((float) ($it['price'] ?? 0)) * ((int) ($it['qty'] ?? 1)), $qualifyingItems))
                : $shopSubtotal;
            $qualifyingQuantity = !empty($shopItems)
                ? (int) array_sum(array_map(fn ($it) => (int) ($it['qty'] ?? 1), $qualifyingItems))
                : 1;

            $isEligible = true;
            $audienceEligible = true;
            $shortfall = 0.0;
            $ineligibleReason = null;

            // Check target audience
            if ($voucher->target_audience === Voucher::AUDIENCE_FOLLOWERS && !$isFollower) {
                $isEligible = false;
                $audienceEligible = false;
                $ineligibleReason = "Follow workshop to unlock";
            } elseif ($voucher->target_audience === Voucher::AUDIENCE_NEW_CUSTOMERS && $priorOrders > 0) {
                $isEligible = false;
                $audienceEligible = false;
                $ineligibleReason = "First-time customers only";
            } elseif ($voucher->target_audience === Voucher::AUDIENCE_REPEAT_CUSTOMERS && $priorOrders === 0) {
                $isEligible = false;
                $audienceEligible = false;
                $ineligibleReason = "Returning customers only";
            }

            // Check product scope
            if ($isEligible && !empty($shopItems) && empty($qualifyingItems)) {
                $isEligible = false;
                $ineligibleReason = $voucher->scope_type === Voucher::SCOPE_CATEGORY
                    ? "Requires category '{$voucher->applicable_category}'"
                    : "No eligible items in cart";
            }

            // Check minimum requirements
            if ($isEligible) {
                if ($voucher->min_requirement_type === Voucher::REQ_QUANTITY) {
                    $minQty = max(1, (int) $voucher->min_quantity);
                    if ($qualifyingQuantity < $minQty) {
                        $isEligible = false;
                        $diff = $minQty - $qualifyingQuantity;
                        $shortfall = (float) $diff;
                        $ineligibleReason = "Add {$diff} more item(s) to unlock";
                    }
                } else {
                    $minSpend = (float) $voucher->min_spend;
                    if ($applicableSubtotal < $minSpend) {
                        $isEligible = false;
                        $shortfall = round($minSpend - $applicableSubtotal, 2);
                        $ineligibleReason = "Add PHP " . number_format($shortfall, 2) . " more to unlock";
                    }
                }
            }

            $discountAmount = $isEligible
                ? $this->calculateDiscount($voucher, $applicableSubtotal)
                : $this->calculatePreviewDiscount($voucher, max($applicableSubtotal, (float) $voucher->min_spend));

            $summary = $this->formatVoucherSummary($voucher, $discountAmount, $isEligible, $shortfall);
            $summary['audience_eligible'] = $audienceEligible;
            $summary['is_following_shop'] = $isFollower;
            $summary['ineligible_reason'] = $ineligibleReason;
            $shopVouchers[$shopKey][] = $summary;
        }

        // Sort featured (Elite shop) & eligible vouchers first
        foreach ($shopVouchers as $shopKey => $list) {
            usort($list, function (array $a, array $b) {
                if ($a['is_eligible'] !== $b['is_eligible']) {
                    return $b['is_eligible'] <=> $a['is_eligible'];
                }
                if ($a['is_featured'] !== $b['is_featured']) {
                    return $b['is_featured'] <=> $a['is_featured'];
                }
                return $b['discount_amount'] <=> $a['discount_amount'];
            });
            $shopVouchers[$shopKey] = $list;
        }

        return [
            'shops' => $shopVouchers,
        ];
    }

    /**
     * Create a new Shop Voucher.
     *
     * @param  User  $seller
     * @param  array<string, mixed>  $data
     */
    public function createVoucher(User $seller, array $data): Voucher
    {
        $wantsActive = array_key_exists('is_active', $data) ? (bool) $data['is_active'] : true;

        if ($wantsActive && !$seller->canCreateMoreVouchers()) {
            $limit = $seller->getActiveVoucherLimit();
            throw ValidationException::withMessages([
                'limit' => "Standard and Premium workshops can maintain up to {$limit} active vouchers at a time. Upgrade to the Elite plan for unlimited shop vouchers.",
            ]);
        }

        $scopeType = $data['scope_type'] ?? Voucher::SCOPE_ALL;
        $reqType = $data['min_requirement_type'] ?? Voucher::REQ_SPEND;

        return Voucher::create([
            'code' => strtoupper(trim((string) $data['code'])),
            'name' => trim((string) $data['name']),
            'description' => isset($data['description']) ? trim((string) $data['description']) : null,
            'shop_id' => $seller->id,
            'discount_type' => $data['discount_type'],
            'scope_type' => $scopeType,
            'applicable_products' => $scopeType === Voucher::SCOPE_SPECIFIC_PRODUCTS
                ? $this->resolveOwnedProductIds((int) $seller->id, (array) ($data['applicable_products'] ?? []))
                : null,
            'applicable_category' => $scopeType === Voucher::SCOPE_CATEGORY
                ? trim((string) ($data['applicable_category'] ?? ''))
                : null,
            'discount_value' => max(1.0, (float) $data['discount_value']),
            'min_spend' => $reqType === Voucher::REQ_SPEND ? max(0.0, (float) ($data['min_spend'] ?? 0.00)) : 0.00,
            'min_requirement_type' => $reqType,
            'min_quantity' => $reqType === Voucher::REQ_QUANTITY ? max(1, (int) ($data['min_quantity'] ?? 1)) : 1,
            'max_discount' => ($data['discount_type'] === Voucher::TYPE_PERCENTAGE && !empty($data['max_discount']))
                ? max(1.0, (float) $data['max_discount'])
                : null,
            'usage_limit_total' => !empty($data['usage_limit_total']) ? (int) $data['usage_limit_total'] : null,
            'usage_limit_per_user' => !empty($data['usage_limit_per_user']) ? (int) $data['usage_limit_per_user'] : 1,
            'used_count' => 0,
            'target_audience' => $data['target_audience'] ?? Voucher::AUDIENCE_ALL,
            'is_public' => array_key_exists('is_public', $data) ? (bool) $data['is_public'] : true,
            'is_active' => $wantsActive,
            'starts_at' => !empty($data['starts_at']) ? Carbon::parse($data['starts_at'])->utc() : now(),
            'expires_at' => !empty($data['expires_at']) ? Carbon::parse($data['expires_at'])->utc() : null,
        ]);
    }

    /**
     * Update an existing Voucher.
     *
     * @param  Voucher  $voucher
     * @param  array<string, mixed>  $data
     */
    public function updateVoucher(Voucher $voucher, array $data): Voucher
    {
        $wantsActive = array_key_exists('is_active', $data) ? (bool) $data['is_active'] : (bool) $voucher->is_active;

        $wasCountedActive = (bool) $voucher->is_active
            && ($voucher->expires_at === null || !$voucher->expires_at->isPast());

        $resolvedExpiresAt = array_key_exists('expires_at', $data)
            ? (!empty($data['expires_at']) ? Carbon::parse($data['expires_at'])->utc() : null)
            : $voucher->expires_at;

        $willBeCountedActive = $wantsActive
            && ($resolvedExpiresAt === null || !$resolvedExpiresAt->isPast());

        if (!$wasCountedActive && $willBeCountedActive && $voucher->shop_id !== null) {
            $seller = $voucher->shop;
            if ($seller && !$seller->canCreateMoreVouchers()) {
                $limit = $seller->getActiveVoucherLimit();
                throw ValidationException::withMessages([
                    'limit' => "Your workshop has reached the maximum of {$limit} active vouchers. Deactivate an existing voucher or upgrade to Elite.",
                ]);
            }
        }

        $scopeType = $data['scope_type'] ?? $voucher->scope_type ?? Voucher::SCOPE_ALL;
        $reqType = $data['min_requirement_type'] ?? $voucher->min_requirement_type ?? Voucher::REQ_SPEND;
        $existingProductIds = array_map('intval', (array) ($voucher->applicable_products ?? []));
        $resolvedStartsAt = array_key_exists('starts_at', $data)
            ? (!empty($data['starts_at']) ? Carbon::parse($data['starts_at'])->utc() : null)
            : $voucher->starts_at;

        $voucher->update([
            'code' => isset($data['code']) ? strtoupper(trim((string) $data['code'])) : $voucher->code,
            'name' => isset($data['name']) ? trim((string) $data['name']) : $voucher->name,
            'description' => array_key_exists('description', $data) ? ($data['description'] ? trim((string) $data['description']) : null) : $voucher->description,
            'discount_type' => $data['discount_type'] ?? $voucher->discount_type,
            'scope_type' => $scopeType,
            'applicable_products' => $scopeType === Voucher::SCOPE_SPECIFIC_PRODUCTS
                ? $this->resolveOwnedProductIds((int) $voucher->shop_id, (array) ($data['applicable_products'] ?? []), $existingProductIds)
                : null,
            'applicable_category' => $scopeType === Voucher::SCOPE_CATEGORY
                ? trim((string) ($data['applicable_category'] ?? ''))
                : null,
            'discount_value' => isset($data['discount_value']) ? max(1.0, (float) $data['discount_value']) : $voucher->discount_value,
            'min_spend' => $reqType === Voucher::REQ_SPEND
                ? (array_key_exists('min_spend', $data) ? max(0.0, (float) ($data['min_spend'] ?? 0.00)) : (float) ($voucher->min_spend ?? 0.00))
                : 0.00,
            'min_requirement_type' => $reqType,
            'min_quantity' => $reqType === Voucher::REQ_QUANTITY ? max(1, (int) ($data['min_quantity'] ?? 1)) : 1,
            'max_discount' => (($data['discount_type'] ?? $voucher->discount_type) === Voucher::TYPE_PERCENTAGE && !empty($data['max_discount']))
                ? max(1.0, (float) $data['max_discount'])
                : null,
            'usage_limit_total' => array_key_exists('usage_limit_total', $data)
                ? (!empty($data['usage_limit_total']) ? (int) $data['usage_limit_total'] : null)
                : $voucher->usage_limit_total,
            'usage_limit_per_user' => !empty($data['usage_limit_per_user'])
                ? (int) $data['usage_limit_per_user']
                : $voucher->usage_limit_per_user,
            'target_audience' => $data['target_audience'] ?? $voucher->target_audience ?? Voucher::AUDIENCE_ALL,
            'is_public' => array_key_exists('is_public', $data) ? (bool) $data['is_public'] : (bool) $voucher->is_public,
            'is_active' => $wantsActive,
            'starts_at' => $resolvedStartsAt,
            'expires_at' => $resolvedExpiresAt,
        ]);

        return $voucher->refresh();
    }

    /**
     * Deactivate a voucher.
     */
    public function deactivateVoucher(Voucher $voucher): Voucher
    {
        $voucher->update(['is_active' => false]);

        return $voucher->refresh();
    }

    /**
     * Automatically revert voucher redemptions and restore buyer quota when an order is cancelled or rejected.
     */
    public function revertRedemptionsForOrder(Order $order): void
    {
        if (!rescue(fn () => Schema::hasTable('voucher_redemptions'), false)) {
            return;
        }

        DB::transaction(function () use ($order) {
            $activeRedemptions = VoucherRedemption::where('order_id', $order->id)
                ->where('status', VoucherRedemption::STATUS_REDEEMED)
                ->lockForUpdate()
                ->get();

            if ($activeRedemptions->isEmpty()) {
                return;
            }

            foreach ($activeRedemptions as $redemption) {
                $redemption->update([
                    'status' => VoucherRedemption::STATUS_CANCELLED,
                    'cancelled_at' => now(),
                ]);

                $voucher = Voucher::withTrashed()
                    ->where('id', $redemption->voucher_id)
                    ->lockForUpdate()
                    ->first();

                if ($voucher && (int) $voucher->used_count > 0) {
                    $voucher->decrement('used_count');
                }
            }
        });
    }

    /**
     * Build seller voucher dashboard payload (list, stats, quota).
     *
     * @return array<string, mixed>
     */
    public function getSellerVoucherDashboardData(User $seller): array
    {
        if (!rescue(fn () => Schema::hasTable('vouchers'), false)) {
            return [
                'vouchers' => [],
                'voucherStats' => [
                    'ongoing_count' => 0,
                    'upcoming_count' => 0,
                    'expired_count' => 0,
                    'total_redeemed' => 0,
                ],
                'voucherQuota' => [
                    'active_count' => 0,
                    'limit' => $seller->getActiveVoucherLimit(),
                    'can_create' => true,
                    'is_elite' => $seller->isEliteTier(),
                ],
            ];
        }

        $vouchers = Voucher::where('shop_id', $seller->id)
            ->orderByDesc('is_active')
            ->latest()
            ->get();

        $ongoingCount = $vouchers->where('status_label', 'ongoing')->count();
        $upcomingCount = $vouchers->where('status_label', 'upcoming')->count();
        $expiredCount = $vouchers->whereIn('status_label', ['expired', 'depleted', 'inactive'])->count();
        $totalRedeemed = (int) $vouchers->sum('used_count');

        return [
            'vouchers' => $vouchers->values()->all(),
            'voucherStats' => [
                'ongoing_count' => $ongoingCount,
                'upcoming_count' => $upcomingCount,
                'expired_count' => $expiredCount,
                'total_redeemed' => $totalRedeemed,
            ],
            'voucherQuota' => [
                'active_count' => $seller->getActiveVoucherCount(),
                'limit' => $seller->getActiveVoucherLimit(),
                'can_create' => $seller->canCreateMoreVouchers(),
                'is_elite' => $seller->isEliteTier(),
            ],
        ];
    }

    /**
     * Restrict voucher product applicability list strictly to products owned by the issuing shop.
     *
     * @param  int  $shopId
     * @param  array<int|string>  $productIds
     * @param  array<int>  $allowTrashedIds
     * @return array<int, int>
     */
    private function resolveOwnedProductIds(int $shopId, array $productIds, array $allowTrashedIds = []): array
    {
        $ids = array_values(array_unique(array_filter(array_map('intval', $productIds))));
        if (empty($ids)) {
            return [];
        }

        $query = Product::where('user_id', $shopId)->whereIn('id', $ids);

        if (!empty($allowTrashedIds)) {
            $query->withTrashed()->where(function ($q) use ($allowTrashedIds) {
                $q->whereNull('deleted_at')->orWhereIn('id', $allowTrashedIds);
            });
        }

        return $query
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    private function calculatePreviewDiscount(Voucher $voucher, float $previewSubtotal): float
    {
        if ($voucher->discount_type === Voucher::TYPE_PERCENTAGE) {
            $discount = round($previewSubtotal * ((float) $voucher->discount_value / 100.0), 2);
            if ($voucher->max_discount !== null && (float) $voucher->max_discount > 0) {
                $discount = min($discount, (float) $voucher->max_discount);
            }
            return $discount;
        }

        return round((float) $voucher->discount_value, 2);
    }

    /**
     * @return array<string, mixed>
     */
    public function formatVoucherSummary(
        Voucher $voucher,
        float $discountAmount,
        bool $isEligible = true,
        float $shortfall = 0.0,
        bool $includeModel = false
    ): array {
        $shop = $voucher->shop;
        $isFeatured = (bool) ($shop?->isEliteTier());

        $summary = [
            'id' => $voucher->id,
            'code' => $voucher->code,
            'name' => $voucher->name,
            'description' => $voucher->description,
            'shop_id' => $voucher->shop_id,
            'shop_name' => $shop?->shop_name ?: ($shop?->name ?: 'Artisan Workshop'),
            'is_featured' => $isFeatured,
            'discount_type' => $voucher->discount_type,
            'scope_type' => $voucher->scope_type ?? 'all',
            'applicable_products' => $voucher->applicable_products ?: [],
            'applicable_category' => $voucher->applicable_category ?: null,
            'discount_value' => (float) $voucher->discount_value,
            'min_spend' => (float) $voucher->min_spend,
            'min_requirement_type' => $voucher->min_requirement_type ?? 'spend',
            'min_quantity' => (int) ($voucher->min_quantity ?? 1),
            'max_discount' => $voucher->max_discount !== null ? (float) $voucher->max_discount : null,
            'usage_limit_total' => $voucher->usage_limit_total,
            'usage_limit_per_user' => $voucher->usage_limit_per_user,
            'used_count' => (int) $voucher->used_count,
            'target_audience' => $voucher->target_audience ?? 'all',
            'starts_at' => $voucher->starts_at?->toIso8601String(),
            'expires_at' => $voucher->expires_at?->toIso8601String(),
            'expires_formatted' => $voucher->expires_at?->format('M d, Y'),
            'discount_amount' => round($discountAmount, 2),
            'is_eligible' => $isEligible,
            'shortfall' => round($shortfall, 2),
        ];

        if ($includeModel) {
            $summary['voucher'] = $voucher;
        }

        return $summary;
    }
}
