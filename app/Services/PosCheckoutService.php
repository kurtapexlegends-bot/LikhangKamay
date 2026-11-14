<?php

namespace App\Services;

use App\Casts\PostgresCompatibleBoolean;
use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\SellerLocation;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Notifications\LowStockNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PosCheckoutService
{
    public function __construct(
        private readonly OrderFinanceService $orderFinanceService,
        private readonly BOMDeductionService $bomDeductionService
    ) {
    }

    /**
     * Execute an atomic walk-in POS sale: lock retail products, verify stock,
     * compute BIR VAT ledger columns, create Completed/Paid order, and deduct composite BOM supplies.
     *
     * @param  array{
     *     items: array<int, array{product_id: int, quantity: int}>,
     *     payment_method: string,
     *     cash_tendered?: float|int|string|null,
     *     payment_reference?: string|null,
     *     customer_name?: string|null
     * }  $payload
     */
    public function checkout(User $actor, User $sellerOwner, array $payload, array $auditContext = []): Order
    {
        $requestedQuantities = $this->normalizeRequestedQuantities($payload['items'] ?? []);
        if (empty($requestedQuantities)) {
            throw ValidationException::withMessages([
                'items' => 'Select at least one retail item before completing a walk-in sale.',
            ]);
        }

        $terminalContext = $this->resolveTerminalContext($actor, $sellerOwner, $auditContext, true);
        $lowStockNotifications = [];

        /** @var Order $createdOrder */
        $createdOrder = DB::transaction(function () use (
            $actor,
            $sellerOwner,
            $payload,
            $requestedQuantities,
            $terminalContext,
            &$lowStockNotifications
        ) {
            $productIds = array_keys($requestedQuantities);
            sort($productIds);

            $lockedProducts = Product::query()
                ->with(['supply', 'recipes.supply.product', 'discounts'])
                ->where('user_id', $sellerOwner->id)
                ->where('status', 'Active')
                ->where('is_b2b_supply', PostgresCompatibleBoolean::dbVal(false))
                ->whereIn('id', $productIds)
                ->orderBy('id')
                ->lockForUpdate()
                ->get()
                ->keyBy('id');

            $merchandiseSubtotal = 0.0;
            $preparedLines = [];
            $touchedDiscountIds = [];

            foreach ($productIds as $productId) {
                $qty = $requestedQuantities[$productId];
                /** @var Product|null $product */
                $product = $lockedProducts->get($productId);

                if (!$product) {
                    throw ValidationException::withMessages([
                        'items' => 'One or more selected products are unavailable for studio walk-in sale.',
                    ]);
                }

                if ((int) $product->stock < $qty) {
                    throw ValidationException::withMessages([
                        'items' => "Insufficient stock for {$product->name}. Requested {$qty}, available {$product->stock}.",
                    ]);
                }

                if (!empty($touchedDiscountIds) && $product->discounts->pluck('id')->intersect($touchedDiscountIds)->isNotEmpty()) {
                    $product->load('discounts');
                }

                $discountInfo = $product->discount_info;
                $regularPrice = round((float) $product->price, 2);
                $discountedPrice = $discountInfo ? round((float) $discountInfo['discounted_price'], 2) : $regularPrice;
                $maxLimit = ($discountInfo && isset($discountInfo['max_purchase_limit']) && (int) $discountInfo['max_purchase_limit'] > 0)
                    ? (int) $discountInfo['max_purchase_limit']
                    : null;

                $promoQty = 0;
                $regularQty = $qty;
                $appliedDiscountId = null;

                if ($discountInfo && $discountedPrice < $regularPrice && !empty($discountInfo['id'])) {
                    $lockedDiscount = Discount::query()
                        ->whereKey((int) $discountInfo['id'])
                        ->lockForUpdate()
                        ->first();

                    if ($lockedDiscount && $lockedDiscount->is_currently_active) {
                        $discountedPrice = round((float) $lockedDiscount->calculateDiscountedPrice($regularPrice), 2);
                        $maxLimit = ($lockedDiscount->max_purchase_limit && (int) $lockedDiscount->max_purchase_limit > 0)
                            ? (int) $lockedDiscount->max_purchase_limit
                            : null;

                        $candidatePromoQty = $maxLimit !== null ? min($qty, $maxLimit) : $qty;
                        if ($lockedDiscount->promo_stock !== null) {
                            $remainingPromoStock = max(0, (int) $lockedDiscount->promo_stock - (int) ($lockedDiscount->promo_sold ?? 0));
                            $candidatePromoQty = min($candidatePromoQty, $remainingPromoStock);
                        }

                        if ($discountedPrice < $regularPrice && $candidatePromoQty > 0) {
                            $promoQty = $candidatePromoQty;
                            $regularQty = $qty - $promoQty;
                            $lockedDiscount->increment('promo_sold', $promoQty);
                            $appliedDiscountId = (int) $lockedDiscount->id;
                            $touchedDiscountIds[] = $appliedDiscountId;
                        }
                    }
                }

                $lineTotal = round(($promoQty * $discountedPrice) + ($regularQty * $regularPrice), 2);
                $merchandiseSubtotal += $lineTotal;

                $product->decrement('stock', $qty);
                $product->increment('sold', $qty);
                $product->refresh();

                if ($product->track_as_supply && $product->supply) {
                    $product->supply->update(['quantity' => $product->stock]);
                }

                if ((int) $product->stock <= 5) {
                    $lowStockNotifications[] = clone $product;
                }

                if ($promoQty > 0) {
                    $preparedLines[] = [
                        'product_id' => $product->id,
                        'discount_id' => $appliedDiscountId,
                        'product_name' => $product->name,
                        'variant' => null,
                        'price' => $discountedPrice,
                        'cost' => (float) ($product->cost_price ?? 0),
                        'quantity' => $promoQty,
                        'product_img' => $product->cover_photo_path,
                        'is_b2b_supply' => false,
                        'supply_unit' => $product->supply_unit ?: 'pcs',
                    ];
                }

                if ($regularQty > 0) {
                    $preparedLines[] = [
                        'product_id' => $product->id,
                        'discount_id' => null,
                        'product_name' => $product->name,
                        'variant' => null,
                        'price' => $regularPrice,
                        'cost' => (float) ($product->cost_price ?? 0),
                        'quantity' => $regularQty,
                        'product_img' => $product->cover_photo_path,
                        'is_b2b_supply' => false,
                        'supply_unit' => $product->supply_unit ?: 'pcs',
                    ];
                }
            }

            $finance = $this->orderFinanceService->calculateAmounts(
                merchandiseSubtotal: round($merchandiseSubtotal, 2),
                shippingMethod: 'Pick Up',
                shippingFee: 0.00,
                seller: $sellerOwner,
                shopVoucherDiscount: 0.00
            );

            $grandTotal = (float) $finance['total_amount'];
            $methodCode = (string) ($payload['payment_method'] ?? 'pos_cash');
            $paymentMethodLabel = match ($methodCode) {
                'pos_gcash' => 'POS GCash',
                'pos_maya' => 'POS Maya',
                default => 'POS Cash',
            };

            $cashTendered = null;
            $changeAmount = null;

            if ($methodCode === 'pos_cash') {
                $cashTendered = round((float) ($payload['cash_tendered'] ?? 0), 2);
                if ($cashTendered < $grandTotal) {
                    throw ValidationException::withMessages([
                        'cash_tendered' => sprintf('Cash tendered (PHP %.2f) is less than total amount due (PHP %.2f).', $cashTendered, $grandTotal),
                    ]);
                }
                $changeAmount = round($cashTendered - $grandTotal, 2);
            }

            $customerName = trim((string) ($payload['customer_name'] ?? ''));
            if ($customerName === '') {
                $customerName = 'Walk-In Customer';
            }

            $paymentReference = trim((string) ($payload['payment_reference'] ?? ''));
            if ($methodCode !== 'pos_cash' && $paymentReference !== '') {
                $duplicateOrder = Order::query()
                    ->where('artisan_id', $sellerOwner->id)
                    ->where('order_type', Order::TYPE_POS_WALKIN)
                    ->where('status', '!=', Order::STATUS_CANCELLED)
                    ->where('pos_payment_reference', $paymentReference)
                    ->lockForUpdate()
                    ->first(['id', 'order_number']);

                if ($duplicateOrder) {
                    throw ValidationException::withMessages([
                        'payment_reference' => "Reference {$paymentReference} was already recorded on walk-in receipt {$duplicateOrder->order_number}.",
                    ]);
                }
            }

            $now = now();

            $order = Order::create(Order::filterSchemaCompatibleAttributes([
                'artisan_id' => $sellerOwner->id,
                'user_id' => null,
                'order_type' => Order::TYPE_POS_WALKIN,
                'order_number' => $this->generateUniquePosOrderNumber(),
                'customer_name' => $customerName,
                'merchandise_subtotal' => $finance['merchandise_subtotal'],
                'convenience_fee_amount' => 0.00,
                'shipping_fee_amount' => 0.00,
                'platform_commission_amount' => 0.00,
                'seller_net_amount' => $finance['seller_net_amount'],
                'total_amount' => $grandTotal,
                'pos_cash_tendered' => $cashTendered,
                'pos_change_amount' => $changeAmount,
                'pos_payment_reference' => $paymentReference !== '' ? $paymentReference : null,
                'pos_processed_by_user_id' => $actor->id,
                'pos_location_id' => $terminalContext['location_id'],
                'vat_type' => $finance['vat_type'],
                'vatable_sales' => $finance['vatable_sales'],
                'vat_amount' => $finance['vat_amount'],
                'vat_exempt_sales' => $finance['vat_exempt_sales'],
                'vat_rate' => $finance['vat_rate'],
                'status' => Order::STATUS_COMPLETED,
                'payment_method' => $paymentMethodLabel,
                'payment_status' => 'paid',
                'shipping_method' => 'Walk-In POS',
                'shipping_address' => $terminalContext['location_address'] ?: $this->resolveStudioAddress($sellerOwner),
                'accepted_at' => $now,
                'received_at' => $now,
                'is_test' => (bool) ($sellerOwner->is_test ?? false),
            ]));

            foreach ($preparedLines as $line) {
                $order->items()->create($line);
            }

            try {
                $this->bomDeductionService->deductForOrder($order, $actor->id);
            } catch (\Throwable $e) {
                throw ValidationException::withMessages([
                    'items' => $e->getMessage(),
                ]);
            }

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $sellerOwner->id,
                'actor_user_id' => $actor->id,
                'actor_type' => SellerActivityLog::resolveActorType($actor, 'owner'),
                'category' => 'orders',
                'module' => 'orders',
                'event_type' => 'pos_walkin_completed',
                'severity' => 'info',
                'status' => 'completed',
                'title' => 'Walk-In POS Sale Completed',
                'summary' => sprintf(
                    '%s processed walk-in sale %s (PHP %.2f via %s).',
                    $actor->name,
                    $order->order_number,
                    $grandTotal,
                    $paymentMethodLabel
                ),
                'subject_type' => Order::class,
                'subject_id' => $order->id,
                'subject_label' => $order->order_number,
                'details' => array_merge([
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'order_type' => Order::TYPE_POS_WALKIN,
                    'payment_method' => $paymentMethodLabel,
                    'payment_reference' => $paymentReference !== '' ? $paymentReference : null,
                    'total_amount' => $grandTotal,
                    'cash_tendered' => $cashTendered,
                    'change_amount' => $changeAmount,
                ], $terminalContext),
            ]);

            return $order->load(['items', 'artisan', 'processedBy', 'posLocation']);
        });

        $this->invalidateSellerAnalyticsCaches($sellerOwner->id, $createdOrder);

        foreach ($lowStockNotifications as $lowStockProduct) {
            rescue(
                fn () => $sellerOwner->notifySellerWorkspace(new LowStockNotification($lowStockProduct), 'products'),
                report: false
            );
        }

        return $createdOrder;
    }

    /**
     * Void/refund a completed walk-in POS sale and atomically restore finished inventory,
     * linked wholesale supply counts, promo counters, and manufactured BOM raw materials.
     */
    public function voidOrder(
        Order $order,
        User $actor,
        User $sellerOwner,
        ?string $reason = null,
        array $auditContext = [],
        ?int $supervisorId = null,
        ?string $supervisorPin = null
    ): Order {
        if (!$actor->canEditSellerModule('orders') && !$actor->isSellerOwner()) {
            throw ValidationException::withMessages([
                'order' => 'Orders edit permission is required to process a POS void.',
            ]);
        }

        $cleanReason = trim((string) $reason);
        if (mb_strlen($cleanReason) < 5) {
            throw ValidationException::withMessages([
                'reason' => 'Please enter a clear void reason (at least 5 characters).',
            ]);
        }

        $order->loadMissing(['artisan', 'processedBy', 'posLocation']);
        if ((int) $order->artisan_id !== (int) $sellerOwner->id || !$order->isPosWalkIn()) {
            throw ValidationException::withMessages([
                'order' => 'Only walk-in POS orders belonging to this studio can be voided.',
            ]);
        }

        if (!$this->canActorAccessPosOrder($actor, $sellerOwner, $order)) {
            throw ValidationException::withMessages([
                'order' => 'You are not authorized to void walk-in POS orders from another branch or user.',
            ]);
        }

        $supervisor = $this->verifyVoidSupervisorPin(
            $order,
            $actor,
            $sellerOwner,
            $supervisorId,
            $supervisorPin,
            $auditContext
        );

        $terminalContext = $this->resolveTerminalContext($actor, $sellerOwner, $auditContext, false);

        /** @var Order $voidedOrder */
        $voidedOrder = DB::transaction(function () use ($order, $actor, $sellerOwner, $supervisor, $cleanReason, $terminalContext) {
            /** @var Order $lockedOrder */
            $lockedOrder = Order::query()
                ->with(['items', 'artisan', 'processedBy', 'posLocation'])
                ->where('id', $order->id)
                ->lockForUpdate()
                ->firstOrFail();

            if ((int) $lockedOrder->artisan_id !== (int) $sellerOwner->id || !$lockedOrder->isPosWalkIn()) {
                throw ValidationException::withMessages([
                    'order' => 'Only walk-in POS orders belonging to this studio can be voided.',
                ]);
            }

            if (!$this->canActorAccessPosOrder($actor, $sellerOwner, $lockedOrder)) {
                throw ValidationException::withMessages([
                    'order' => 'You are not authorized to void walk-in POS orders from another branch or user.',
                ]);
            }

            if ($lockedOrder->status !== Order::STATUS_COMPLETED || $lockedOrder->payment_status !== 'paid') {
                throw ValidationException::withMessages([
                    'order' => 'This walk-in POS receipt has already been voided or refunded.',
                ]);
            }

            $productIds = $lockedOrder->items->pluck('product_id')->filter()->unique()->sort()->values()->all();
            $lockedProducts = empty($productIds)
                ? collect()
                : Product::query()
                    ->with('supply')
                    ->whereIn('id', $productIds)
                    ->orderBy('id')
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

            foreach ($lockedOrder->items as $item) {
                $qty = (int) $item->quantity;
                if ($qty <= 0) {
                    continue;
                }

                /** @var Product|null $product */
                $product = $lockedProducts->get($item->product_id);
                if ($product) {
                    $product->stock = (int) $product->stock + $qty;
                    $product->sold = max(0, (int) $product->sold - $qty);
                    $product->save();

                    if ($product->track_as_supply && $product->supply) {
                        $product->supply->update(['quantity' => $product->stock]);
                    }
                }

                if ($item->discount_id) {
                    $discount = Discount::query()->where('id', $item->discount_id)->lockForUpdate()->first();
                    if ($discount) {
                        $discount->update(['promo_sold' => max(0, (int) $discount->promo_sold - $qty)]);
                    }
                }
            }

            $lockedOrder->update([
                'status' => Order::STATUS_CANCELLED,
                'payment_status' => 'refunded',
                'cancelled_at' => now(),
                'cancellation_reason' => $cleanReason,
            ]);

            $this->bomDeductionService->restoreForOrder($lockedOrder);

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $sellerOwner->id,
                'actor_user_id' => $actor->id,
                'actor_type' => SellerActivityLog::resolveActorType($actor, 'owner'),
                'category' => 'orders',
                'module' => 'orders',
                'event_type' => 'pos_walkin_voided',
                'severity' => 'warning',
                'status' => 'refunded',
                'title' => 'Walk-In POS Sale Voided',
                'summary' => (int) $actor->id === (int) $supervisor->id
                    ? sprintf(
                        '%s voided walk-in sale %s (PHP %.2f). Reason: %s',
                        $actor->name,
                        $lockedOrder->order_number,
                        (float) $lockedOrder->total_amount,
                        $cleanReason
                    )
                    : sprintf(
                        '%s voided walk-in sale %s (PHP %.2f) — Authorized by %s (%s). Reason: %s',
                        $actor->name,
                        $lockedOrder->order_number,
                        (float) $lockedOrder->total_amount,
                        $supervisor->name,
                        $this->resolveActorRoleLabel($supervisor),
                        $cleanReason
                    ),
                'subject_type' => Order::class,
                'subject_id' => $lockedOrder->id,
                'subject_label' => $lockedOrder->order_number,
                'details' => array_merge([
                    'order_id' => $lockedOrder->id,
                    'order_number' => $lockedOrder->order_number,
                    'order_type' => Order::TYPE_POS_WALKIN,
                    'payment_method' => $lockedOrder->payment_method,
                    'total_amount' => (float) $lockedOrder->total_amount,
                    'reason' => $cleanReason,
                    'approved_by_user_id' => $supervisor->id,
                    'approved_by_name' => $supervisor->name,
                    'approved_by_role' => $this->resolveActorRoleLabel($supervisor),
                ], $terminalContext),
            ]);

            return $lockedOrder->fresh(['items', 'artisan', 'processedBy', 'posLocation']);
        });

        $this->invalidateSellerAnalyticsCaches($sellerOwner->id, $voidedOrder);

        return $voidedOrder;
    }

    private function invalidateSellerAnalyticsCaches(int $sellerOwnerId, Order $order): void
    {
        rescue(function () use ($sellerOwnerId, $order) {
            Cache::forget("seller_dashboard_metrics_{$sellerOwnerId}");
            app(ShopAnalyticsService::class)->clearCache($sellerOwnerId);
            Cache::forget("seller_analytics_data_{$sellerOwnerId}_" . md5('All Categories'));

            $order->loadMissing('items.product:id,category');
            $categories = $order->items
                ->map(fn ($item) => $item->product?->category)
                ->filter()
                ->unique();

            foreach ($categories as $category) {
                Cache::forget("seller_analytics_data_{$sellerOwnerId}_" . md5((string) $category));
            }
        }, report: false);
    }

    /**
     * @param  array<int, array<string, mixed>>  $items
     * @return array<int, int>
     */
    private function normalizeRequestedQuantities(array $items): array
    {
        $normalized = [];

        foreach ($items as $entry) {
            $productId = (int) ($entry['product_id'] ?? 0);
            $qty = (int) ($entry['quantity'] ?? 0);
            if ($productId <= 0 || $qty <= 0) {
                continue;
            }
            $normalized[$productId] = ($normalized[$productId] ?? 0) + $qty;
        }

        return $normalized;
    }

    private function generateUniquePosOrderNumber(): string
    {
        $prefix = 'POS-' . now()->format('Ymd') . '-';

        for ($attempt = 0; $attempt < 5; $attempt++) {
            $candidate = $prefix . Str::upper(Str::random(6));
            if (!Order::where('order_number', $candidate)->exists()) {
                return $candidate;
            }
        }

        return $prefix . Str::upper(Str::random(10));
    }

    public function canActorVoidPos(User $actor): bool
    {
        return $actor->isSellerOwner()
            || $actor->isStaffManager()
            || $actor->canEditSellerModule('accounting');
    }

    public function updateUserVoidPin(User $user, string $pin, array $auditContext = []): void
    {
        if (
            preg_match('/^(\d)\1{5}$/', $pin)
            || in_array($pin, ['123456', '654321', '012345', '543210', '123123'], true)
        ) {
            throw ValidationException::withMessages([
                'pin' => 'Choose a less predictable 6-digit PIN (avoid repeating or sequential digits).',
            ]);
        }

        $user->forceFill([
            'pos_void_pin' => $pin,
            'pos_void_pin_updated_at' => now(),
        ])->save();

        $sellerOwner = $user->getEffectiveSeller() ?: $user;

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $sellerOwner->id,
            'actor_user_id' => $user->id,
            'actor_type' => SellerActivityLog::resolveActorType($user, 'owner'),
            'category' => 'security',
            'module' => 'orders',
            'event_type' => 'pos_void_pin_updated',
            'severity' => 'info',
            'status' => 'completed',
            'title' => 'POS Void PIN Updated',
            'summary' => sprintf(
                '%s (%s) updated their 6-digit Walk-In POS Void PIN.',
                $user->name,
                $this->resolveActorRoleLabel($user)
            ),
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'subject_label' => $user->name,
            'details' => [
                'actor_role' => $this->resolveActorRoleLabel($user),
                'ip_address' => filled($auditContext['ip_address'] ?? null) ? (string) $auditContext['ip_address'] : null,
                'user_agent' => filled($auditContext['user_agent'] ?? null)
                    ? Str::limit((string) $auditContext['user_agent'], 160, '')
                    : null,
            ],
        ]);
    }

    /**
     * @return array<int, array{id: int, name: string, role_label: string, location_name: string|null, has_pin: bool}>
     */
    public function getVoidApproversForActor(User $terminalActor, User $sellerOwner): array
    {
        $activeLocationCount = $this->countActiveSellerLocations($sellerOwner);
        $terminalLocationId = $this->resolveActorLocationId($terminalActor);

        $candidates = User::query()
            ->with(['employee.assignedLocation'])
            ->where(function (Builder $query) use ($sellerOwner) {
                $query->whereKey($sellerOwner->id)
                    ->orWhere('seller_owner_id', $sellerOwner->id);
            })
            ->whereNull('banned_at')
            ->get();

        return $candidates
            ->filter(function (User $candidate) use ($terminalActor, $activeLocationCount, $terminalLocationId) {
                if (!$this->canActorVoidPos($candidate)) {
                    return false;
                }

                if ($candidate->suspended_until !== null && $candidate->suspended_until->isFuture()) {
                    return false;
                }

                if ($candidate->isStaff()) {
                    if (
                        !$candidate->hasVerifiedEmail()
                        || $candidate->requiresStaffPasswordChange()
                        || !$candidate->isWorkspaceAccessEnabled()
                    ) {
                        return false;
                    }

                    if ($activeLocationCount > 1 && !$terminalActor->isSellerOwner()) {
                        return $terminalLocationId !== null
                            && $this->resolveActorLocationId($candidate) === $terminalLocationId;
                    }
                }

                return true;
            })
            ->sortBy(function (User $candidate) use ($terminalActor) {
                if ((int) $candidate->id === (int) $terminalActor->id) {
                    return '0_' . $candidate->name;
                }
                if ($candidate->isSellerOwner()) {
                    return '1_' . $candidate->name;
                }

                return '2_' . $candidate->name;
            })
            ->map(fn (User $candidate) => [
                'id' => (int) $candidate->id,
                'name' => (string) $candidate->name,
                'role_label' => $this->resolveActorRoleLabel($candidate),
                'location_name' => $candidate->isSellerOwner()
                    ? 'All Branches'
                    : ($candidate->employee?->assignedLocation?->name),
                'has_pin' => $candidate->hasPosVoidPin(),
            ])
            ->values()
            ->all();
    }

    private function verifyVoidSupervisorPin(
        Order $order,
        User $actor,
        User $sellerOwner,
        ?int $supervisorId,
        ?string $supervisorPin,
        array $auditContext
    ): User {
        if (!$supervisorId || $supervisorId <= 0) {
            throw ValidationException::withMessages([
                'supervisor_id' => 'Select the authorizing Shop Owner, Shop Manager, or Accounting supervisor.',
            ]);
        }

        /** @var User|null $supervisor */
        $supervisor = User::query()
            ->with(['employee.assignedLocation'])
            ->whereKey($supervisorId)
            ->whereNull('banned_at')
            ->first();

        $belongsToStudio = $supervisor && (
            (int) $supervisor->id === (int) $sellerOwner->id
            || (
                (int) $supervisor->seller_owner_id === (int) $sellerOwner->id
                && $supervisor->isStaff()
                && $supervisor->isWorkspaceAccessEnabled()
                && $supervisor->hasVerifiedEmail()
                && !$supervisor->requiresStaffPasswordChange()
            )
        );

        if (
            !$belongsToStudio
            || !$this->canActorVoidPos($supervisor)
            || ($supervisor->suspended_until !== null && $supervisor->suspended_until->isFuture())
        ) {
            throw ValidationException::withMessages([
                'supervisor_id' => 'Selected user is not an active void supervisor for this studio.',
            ]);
        }

        if (!$this->canActorAccessPosOrder($supervisor, $sellerOwner, $order)) {
            throw ValidationException::withMessages([
                'supervisor_id' => 'The selected supervisor does not have branch authority for this walk-in receipt.',
            ]);
        }

        if (!$supervisor->hasPosVoidPin()) {
            throw ValidationException::withMessages([
                'supervisor_pin' => "{$supervisor->name} has not configured a 6-digit Void PIN in Profile Settings yet.",
            ]);
        }

        $cleanPin = trim((string) $supervisorPin);
        if (!preg_match('/^\d{6}$/', $cleanPin)) {
            throw ValidationException::withMessages([
                'supervisor_pin' => 'Enter the 6-digit numeric Void PIN for the selected supervisor.',
            ]);
        }

        $ip = filled($auditContext['ip_address'] ?? null) ? (string) $auditContext['ip_address'] : 'terminal';
        $rateKey = "pos-void-pin:{$sellerOwner->id}:{$supervisor->id}:{$ip}";

        if (RateLimiter::tooManyAttempts($rateKey, 5)) {
            $seconds = RateLimiter::availableIn($rateKey);
            throw ValidationException::withMessages([
                'supervisor_pin' => "Too many incorrect Void PIN attempts. Try again in {$seconds} seconds.",
            ]);
        }

        if (!Hash::check($cleanPin, (string) $supervisor->pos_void_pin)) {
            RateLimiter::hit($rateKey, 300);

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $sellerOwner->id,
                'actor_user_id' => $actor->id,
                'actor_type' => SellerActivityLog::resolveActorType($actor, 'owner'),
                'category' => 'orders',
                'module' => 'orders',
                'event_type' => 'pos_walkin_void_denied',
                'severity' => 'warning',
                'status' => 'denied',
                'title' => 'Walk-In POS Void PIN Rejected',
                'summary' => sprintf(
                    'Invalid Void PIN attempt for %s by %s on receipt %s.',
                    $supervisor->name,
                    $actor->name,
                    $order->order_number
                ),
                'subject_type' => Order::class,
                'subject_id' => $order->id,
                'subject_label' => $order->order_number,
                'details' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'attempted_supervisor_id' => $supervisor->id,
                    'attempted_supervisor_name' => $supervisor->name,
                    'ip_address' => filled($auditContext['ip_address'] ?? null) ? (string) $auditContext['ip_address'] : null,
                ],
            ]);

            throw ValidationException::withMessages([
                'supervisor_pin' => 'Incorrect 6-digit Void PIN for the selected supervisor.',
            ]);
        }

        RateLimiter::clear($rateKey);

        return $supervisor;
    }

    public function canActorAccessPosOrder(User $actor, User $sellerOwner, Order $order): bool
    {
        if ((int) $order->artisan_id !== (int) $sellerOwner->id || !$order->isPosWalkIn()) {
            return false;
        }

        if ($actor->isSellerOwner()) {
            return true;
        }

        $activeLocationCount = $this->countActiveSellerLocations($sellerOwner);
        $actorLocationId = $this->resolveActorLocationId($actor);

        if ($this->isBranchSupervisorOrAccounting($actor)) {
            if ($activeLocationCount <= 1) {
                return true;
            }

            if ($actorLocationId !== null) {
                return (int) $order->pos_location_id === (int) $actorLocationId;
            }

            return (int) $order->pos_processed_by_user_id === (int) $actor->id;
        }

        if ((int) $order->pos_processed_by_user_id !== (int) $actor->id) {
            return false;
        }

        if ($activeLocationCount > 1 && $actorLocationId !== null) {
            return (int) $order->pos_location_id === (int) $actorLocationId;
        }

        return true;
    }

    public function applyPosHistoryVisibilityScope(Builder $query, User $actor, User $sellerOwner): Builder
    {
        if ($actor->isSellerOwner()) {
            return $query;
        }

        $activeLocationCount = $this->countActiveSellerLocations($sellerOwner);
        $actorLocationId = $this->resolveActorLocationId($actor);

        if ($this->isBranchSupervisorOrAccounting($actor)) {
            if ($activeLocationCount <= 1) {
                return $query;
            }

            if ($actorLocationId !== null) {
                return $query->where('pos_location_id', $actorLocationId);
            }

            return $query->where('pos_processed_by_user_id', $actor->id);
        }

        $query->where('pos_processed_by_user_id', $actor->id);

        if ($activeLocationCount > 1 && $actorLocationId !== null) {
            $query->where('pos_location_id', $actorLocationId);
        }

        return $query;
    }

    public function resolveActorLocationId(User $actor, ?StaffAttendanceSession $openSession = null): ?int
    {
        if ($actor->isSellerOwner()) {
            return SellerLocation::query()
                ->where('user_id', $actor->id)
                ->active()
                ->orderBy('id')
                ->value('id');
        }

        $session = $openSession ?? app(StaffAttendanceService::class)->getOpenSession($actor);
        if ($session?->seller_location_id) {
            return (int) $session->seller_location_id;
        }

        $employeeLocationId = $actor->employee()->value('assigned_location_id');

        return $employeeLocationId ? (int) $employeeLocationId : null;
    }

    private function countActiveSellerLocations(User $sellerOwner): int
    {
        return SellerLocation::query()
            ->where('user_id', $sellerOwner->id)
            ->active()
            ->count();
    }

    private function isBranchSupervisorOrAccounting(User $actor): bool
    {
        return $actor->isStaffManager() || $actor->canAccessSellerModule('accounting');
    }

    private function resolveActorRoleLabel(User $actor): string
    {
        if ($actor->isSellerOwner()) {
            return 'Shop Owner';
        }

        if ($actor->isStaffManager()) {
            return 'Shop Manager';
        }

        if ($actor->canAccessSellerModule('accounting')) {
            return 'Accounting';
        }

        return 'Staff Cashier';
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveTerminalContext(User $actor, User $sellerOwner, array $auditContext, bool $enforceGeofence): array
    {
        $openSession = null;
        $location = null;

        if ($actor->isStaff()) {
            $openSession = app(StaffAttendanceService::class)->getOpenSession($actor);
            $openSession?->loadMissing('sellerLocation');
            $employee = $actor->employee()->with('assignedLocation')->first();
            $location = $openSession?->sellerLocation ?? $employee?->assignedLocation;

            if (
                $enforceGeofence
                && $location
                && (bool) $location->enforce_strict_geofence
                && !(bool) ($employee?->allow_remote_clock_in ?? false)
            ) {
                if (!$openSession || !(bool) $openSession->is_within_geofence) {
                    throw ValidationException::withMessages([
                        'location' => "Store geofence is active for {$location->name}. Clock in on-site before processing walk-in POS sales.",
                    ]);
                }
            }
        } else {
            $location = SellerLocation::query()
                ->where('user_id', $sellerOwner->id)
                ->active()
                ->orderBy('id')
                ->first();
        }

        return [
            'location_id' => $location?->id,
            'location_name' => $location?->name,
            'location_address' => $location?->address,
            'actor_role' => $this->resolveActorRoleLabel($actor),
            'attendance_session_id' => $openSession?->id,
            'within_geofence' => $openSession ? (bool) $openSession->is_within_geofence : null,
            'distance_meters' => $openSession?->distance_meters !== null ? (int) $openSession->distance_meters : null,
            'liveness_verified' => $openSession ? (bool) $openSession->liveness_verified : null,
            'ip_address' => filled($auditContext['ip_address'] ?? null) ? (string) $auditContext['ip_address'] : null,
            'user_agent' => filled($auditContext['user_agent'] ?? null)
                ? Str::limit((string) $auditContext['user_agent'], 160, '')
                : null,
        ];
    }

    private function resolveStudioAddress(User $sellerOwner): string
    {
        $parts = array_filter([
            $sellerOwner->street_address,
            $sellerOwner->barangay,
            $sellerOwner->city,
            $sellerOwner->region ?: 'Cavite',
        ], fn ($part) => filled($part));

        return !empty($parts)
            ? implode(', ', $parts)
            : 'In-Studio Walk-In Purchase';
    }
}
