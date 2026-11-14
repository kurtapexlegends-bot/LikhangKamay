<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Http\Requests\Seller\CreateDiscountRequest;
use App\Models\Discount;
use App\Models\Product;
use App\Models\OwnerApproval;
use App\Services\DiscountService;
use App\Services\OwnerApprovalService;
use App\Services\StorageUrl;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DiscountController extends Controller
{
    use InteractsWithSellerContext;

    protected DiscountService $discountService;
    protected OwnerApprovalService $ownerApprovalService;

    public function __construct(
        DiscountService $discountService,
        OwnerApprovalService $ownerApprovalService
    ) {
        $this->discountService = $discountService;
        $this->ownerApprovalService = $ownerApprovalService;
    }

    /**
     * Display seller discounts list / Marketing Dashboard.
     */
    public function index(Request $request)
    {
        $seller = $this->sellerOwner();
        abort_unless($seller->canAccessDiscounts(), 403, 'Discounts and promotional pricing are strictly reserved for Elite artisan shops.');
        $sellerId = $seller->id;
        $now = now();
        $statusFilter = $request->query('status', 'ongoing');

        try {
            $query = Discount::where('user_id', $sellerId)
                ->with(['products:id,name,price,sku,cover_photo_path,status']);

            if ($statusFilter === 'ongoing') {
                $query->where('is_active', \Illuminate\Support\Facades\DB::raw('true'))
                      ->where('start_at', '<=', $now)
                      ->where('end_at', '>=', $now);
            } elseif ($statusFilter === 'upcoming') {
                $query->where('is_active', \Illuminate\Support\Facades\DB::raw('true'))
                      ->where('start_at', '>', $now);
            } elseif ($statusFilter === 'expired') {
                $query->where(function ($q) use ($now) {
                    $q->where('is_active', \Illuminate\Support\Facades\DB::raw('false'))
                      ->orWhere('end_at', '<', $now);
                });
            }

            $discounts = $query->latest()->paginate(15)->withQueryString();

            $stats = [
                'ongoing_count' => rescue(fn() => Discount::where('user_id', $sellerId)->active()->count(), 0),
                'upcoming_count' => rescue(fn() => Discount::where('user_id', $sellerId)->where('is_active', \Illuminate\Support\Facades\DB::raw('true'))->where('start_at', '>', $now)->count(), 0),
                'expired_count' => rescue(fn() => Discount::where('user_id', $sellerId)->where(function ($q) use ($now) {
                    $q->where('is_active', \Illuminate\Support\Facades\DB::raw('false'))->orWhere('end_at', '<', $now);
                })->count(), 0),
                'total_promo_sold' => (int) rescue(fn() => Discount::where('user_id', $sellerId)->sum('promo_sold'), 0),
            ];

            if ($request->wantsJson() && !$request->header('X-Inertia')) {
                return response()->json([
                    'success' => true,
                    'discounts' => $discounts,
                    'stats' => $stats,
                ]);
            }

            $products = Product::where('user_id', $sellerId)
                ->select('id', 'name', 'price', 'sku', 'cover_photo_path', 'stock', 'status', 'category')
                ->latest()
                ->get()
                ->map(fn($p) => [
                    'id' => $p->id,
                    'name' => $p->name,
                    'category' => $p->category ?? 'General',
                    'price' => (float) $p->price,
                    'sku' => $p->sku,
                    'stock' => (int) $p->stock,
                    'img' => StorageUrl::url($p->cover_photo_path, '/images/placeholder.svg'),
                ]);

            $actor = $request->user();
            $canAccessVouchers = $actor->canAccessSellerModule('vouchers');
            $canEditVouchers = $actor->isSellerOwner() || $actor->canEditSellerModule('vouchers');
            $canManageVouchers = $actor->isSellerOwner() || ($actor->isStaffManager() && $actor->canEditSellerModule('vouchers'));
            $canEditCampaignDiscounts = $actor->isSellerOwner() || $actor->canEditSellerModule('discounts');

            $voucherData = $canAccessVouchers
                ? rescue(
                    fn () => app(\App\Services\VoucherService::class)->getSellerVoucherDashboardData($seller),
                    ['vouchers' => [], 'voucherStats' => ['ongoing_count' => 0, 'upcoming_count' => 0, 'expired_count' => 0, 'total_redeemed' => 0], 'voucherQuota' => ['active_count' => 0, 'limit' => $seller->getActiveVoucherLimit(), 'can_create' => true, 'is_elite' => $seller->isEliteTier()]]
                )
                : ['vouchers' => [], 'voucherStats' => ['ongoing_count' => 0, 'upcoming_count' => 0, 'expired_count' => 0, 'total_redeemed' => 0], 'voucherQuota' => ['active_count' => 0, 'limit' => $seller->getActiveVoucherLimit(), 'can_create' => false, 'is_elite' => $seller->isEliteTier()]];

            return Inertia::render('Seller/Marketing/DiscountManager', [
                'discounts' => $discounts,
                'stats' => $stats,
                'filters' => [
                    'status' => $statusFilter,
                    'tab' => $request->query('tab', 'campaigns'),
                    'search' => $request->query('search', ''),
                ],
                'products' => $products,
                'vouchers' => $voucherData['vouchers'],
                'voucherStats' => $voucherData['voucherStats'],
                'voucherQuota' => $voucherData['voucherQuota'],
                'canAccessCampaignDiscounts' => true,
                'canAccessVouchers' => $canAccessVouchers,
                'canEditVouchers' => $canEditVouchers,
                'canManageVouchers' => $canManageVouchers,
                'canEditCampaignDiscounts' => $canEditCampaignDiscounts,
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error('DiscountController index error: ' . $e->getMessage(), [
                'exception' => $e
            ]);

            $emptyPaginator = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 15);
            $emptyStats = [
                'ongoing_count' => 0,
                'upcoming_count' => 0,
                'expired_count' => 0,
                'total_promo_sold' => 0,
            ];

            if ($request->wantsJson() && !$request->header('X-Inertia')) {
                return response()->json([
                    'success' => false,
                    'discounts' => $emptyPaginator,
                    'stats' => $emptyStats,
                ]);
            }

            $actor = $request->user();
            $canAccessVouchers = $actor ? $actor->canAccessSellerModule('vouchers') : false;
            $voucherData = $canAccessVouchers
                ? rescue(
                    fn () => app(\App\Services\VoucherService::class)->getSellerVoucherDashboardData($seller),
                    ['vouchers' => [], 'voucherStats' => ['ongoing_count' => 0, 'upcoming_count' => 0, 'expired_count' => 0, 'total_redeemed' => 0], 'voucherQuota' => ['active_count' => 0, 'limit' => $seller->getActiveVoucherLimit(), 'can_create' => true, 'is_elite' => $seller->isEliteTier()]]
                )
                : ['vouchers' => [], 'voucherStats' => ['ongoing_count' => 0, 'upcoming_count' => 0, 'expired_count' => 0, 'total_redeemed' => 0], 'voucherQuota' => ['active_count' => 0, 'limit' => $seller->getActiveVoucherLimit(), 'can_create' => false, 'is_elite' => $seller->isEliteTier()]];

            return Inertia::render('Seller/Marketing/DiscountManager', [
                'discounts' => $emptyPaginator,
                'stats' => $emptyStats,
                'filters' => [
                    'status' => $statusFilter,
                    'tab' => $request->query('tab', 'campaigns'),
                    'search' => $request->query('search', ''),
                ],
                'products' => collect(),
                'vouchers' => $voucherData['vouchers'],
                'voucherStats' => $voucherData['voucherStats'],
                'voucherQuota' => $voucherData['voucherQuota'],
                'canAccessCampaignDiscounts' => true,
                'canAccessVouchers' => $canAccessVouchers,
                'canEditVouchers' => $actor ? ($actor->isSellerOwner() || $actor->canEditSellerModule('vouchers')) : false,
                'canManageVouchers' => $actor ? ($actor->isSellerOwner() || ($actor->isStaffManager() && $actor->canEditSellerModule('vouchers'))) : false,
                'canEditCampaignDiscounts' => $actor ? ($actor->isSellerOwner() || $actor->canEditSellerModule('discounts')) : false,
                'load_error' => 'Unable to load discounts at this moment.',
            ]);
        }
    }

    /**
     * Create and apply a new discount to selected products.
     */
    public function store(CreateDiscountRequest $request)
    {
        $seller = $this->sellerOwner();
        abort_unless($seller->canAccessDiscounts(), 403, 'Discounts and promotional pricing are strictly reserved for Elite artisan shops.');
        $actor = $request->user();
        $validated = $request->validated();
        $isPrivileged = $actor->isSellerOwner() || $actor->isStaffManager();

        if (!$isPrivileged) {
            // Standard staff drafts discount as inactive and routes all grouped campaigns to Team Requests
            $validated['is_active'] = false;
            $createdDiscounts = $this->discountService->createDiscounts($seller, $validated);
            $firstDiscount = $createdDiscounts[0] ?? null;

            if ($firstDiscount) {
                $discountIds = collect($createdDiscounts)->pluck('id')->map(fn ($id) => (int) $id)->values()->all();
                $allProductIds = collect($createdDiscounts)
                    ->flatMap(fn ($d) => $d->products()->pluck('products.id'))
                    ->map(fn ($id) => (int) $id)
                    ->unique()
                    ->values()
                    ->all();

                $payload = $this->ownerApprovalService->buildDiscountPayload($firstDiscount, $allProductIds);
                $payload['mode'] = 'create';
                $payload['discount_ids'] = $discountIds;
                $payload['groups_count'] = count($discountIds);

                $this->ownerApprovalService->submitRequest(
                    seller: $seller,
                    requester: $actor,
                    domain: OwnerApproval::DOMAIN_DISCOUNT,
                    title: 'Discount Campaign: ' . ($firstDiscount->name ?: 'Promotional Discount'),
                    summary: "Staff submitted a {$payload['discount_display']} discount across {$payload['products_count']} product(s).",
                    approvable: $firstDiscount,
                    payload: $payload
                );
            }

            return redirect()->back()->with('success', 'Discount campaign submitted to shop owner for review.');
        }

        $this->discountService->createDiscounts(
            $seller,
            $validated
        );

        return redirect()->back()->with('success', 'Discount created and applied successfully.');
    }

    /**
     * Update an existing discount campaign.
     */
    public function update(CreateDiscountRequest $request, Discount $discount)
    {
        $seller = $this->sellerOwner();
        abort_unless($seller->canAccessDiscounts(), 403, 'Discounts and promotional pricing are strictly reserved for Elite artisan shops.');

        if ($discount->user_id !== $seller->id) {
            abort(403, 'Unauthorized discount modification.');
        }

        $actor = $request->user();
        $validated = $request->validated();
        $isPrivileged = $actor->isSellerOwner() || $actor->isStaffManager();

        if (!$isPrivileged) {
            $previewDiscount = $discount->replicate();
            $previewDiscount->name = $validated['name'] ?? $discount->name;
            $previewDiscount->type = $validated['type'] ?? $discount->type;
            $previewDiscount->value = isset($validated['value']) ? (float) $validated['value'] : $discount->value;
            $previewDiscount->promo_stock = isset($validated['promo_stock']) ? (int) $validated['promo_stock'] : $discount->promo_stock;
            $previewDiscount->start_at = $validated['start_at'] ?? $discount->start_at;
            $previewDiscount->end_at = $validated['end_at'] ?? $discount->end_at;

            $productIds = isset($validated['product_ids']) && is_array($validated['product_ids'])
                ? array_values(array_map('intval', $validated['product_ids']))
                : (isset($validated['items']) && is_array($validated['items'])
                    ? array_values(array_map('intval', array_column($validated['items'], 'product_id')))
                    : $discount->products()->pluck('products.id')->all());

            $payload = $this->ownerApprovalService->buildDiscountPayload($previewDiscount, $productIds);
            $payload['discount_id'] = $discount->id;
            $payload['mode'] = 'update';
            $payload['pending_update'] = $validated;

            $existingPending = OwnerApproval::query()
                ->where('seller_id', $seller->id)
                ->where('domain', OwnerApproval::DOMAIN_DISCOUNT)
                ->where('approvable_type', Discount::class)
                ->where('approvable_id', $discount->id)
                ->where('status', OwnerApproval::STATUS_PENDING)
                ->first();

            $title = 'Update Discount: ' . ($previewDiscount->name ?: 'Promotional Discount');
            $summary = "Staff requested changes to {$title} ({$payload['discount_display']}).";

            if ($existingPending) {
                $existingPending->update([
                    'requester_id' => $actor->id,
                    'title' => $title,
                    'summary' => $summary,
                    'changes_payload' => $payload,
                ]);
                $this->ownerApprovalService->forgetPendingCountCache($seller->id);
            } else {
                $this->ownerApprovalService->submitRequest(
                    seller: $seller,
                    requester: $actor,
                    domain: OwnerApproval::DOMAIN_DISCOUNT,
                    title: $title,
                    summary: $summary,
                    approvable: $discount,
                    payload: $payload
                );
            }

            return redirect()->back()->with('success', 'Discount update submitted to shop owner for review.');
        }

        $this->discountService->updateDiscount($discount, $validated);

        return redirect()->back()->with('success', 'Discount campaign updated successfully.');
    }

    /**
     * Cancel / deactivate a discount.
     */
    public function destroy(Request $request, Discount $discount)
    {
        $seller = $this->sellerOwner();
        $sellerId = $seller->id;

        if ($discount->user_id !== $sellerId) {
            abort(403, 'Unauthorized discount modification.');
        }

        $actor = $request->user();
        $isPrivileged = $actor->isSellerOwner() || $actor->isStaffManager();

        if (!$isPrivileged) {
            $productIds = $discount->products()->pluck('products.id')->all();
            $payload = $this->ownerApprovalService->buildDiscountPayload($discount, $productIds);
            $payload['discount_id'] = $discount->id;
            $payload['mode'] = 'deactivate';

            $existingPending = OwnerApproval::query()
                ->where('seller_id', $sellerId)
                ->where('domain', OwnerApproval::DOMAIN_DISCOUNT)
                ->where('approvable_type', Discount::class)
                ->where('approvable_id', $discount->id)
                ->where('status', OwnerApproval::STATUS_PENDING)
                ->first();

            if ($existingPending) {
                return redirect()->back()->with('error', 'A pending review request already exists for this discount.');
            }

            $this->ownerApprovalService->submitRequest(
                seller: $seller,
                requester: $actor,
                domain: OwnerApproval::DOMAIN_DISCOUNT,
                title: 'Deactivate Discount: ' . ($discount->name ?: "Promo #{$discount->id}"),
                summary: "Staff requested deactivating active promo ({$payload['discount_display']}).",
                approvable: $discount,
                payload: $payload
            );

            return redirect()->back()->with('success', 'Discount deactivation submitted for Shop Owner / Manager review.');
        }

        $this->discountService->deactivateDiscount($discount);

        return redirect()->back()->with('success', 'Discount deactivated successfully.');
    }
}
