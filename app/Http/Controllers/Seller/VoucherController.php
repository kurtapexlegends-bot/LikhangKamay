<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\SaveVoucherRequest;
use App\Models\OwnerApproval;
use App\Models\Product;
use App\Models\Voucher;
use App\Services\OwnerApprovalService;
use App\Services\StorageUrl;
use App\Services\VoucherService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class VoucherController extends Controller
{
    use InteractsWithSellerContext;

    public function __construct(
        protected VoucherService $voucherService,
        protected ?OwnerApprovalService $ownerApprovalService = null
    ) {
        $this->ownerApprovalService ??= app(OwnerApprovalService::class);
    }

    /**
     * Display seller vouchers manager (accessible to Standard, Premium, and Elite workshops).
     */
    public function index(Request $request)
    {
        $seller = $this->sellerOwner();
        $actor = $request->user();
        $voucherData = $this->voucherService->getSellerVoucherDashboardData($seller);

        $products = Product::where('user_id', $seller->id)
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

        $canAccessDiscounts = $seller->canAccessDiscounts() && $actor->canAccessSellerModule('discounts');
        $canEditVouchers = $actor->isSellerOwner() || $actor->canEditSellerModule('vouchers');
        $canEditCampaignDiscounts = $actor->isSellerOwner() || $actor->canEditSellerModule('discounts');

        return Inertia::render('Seller/Marketing/DiscountManager', [
            'discounts' => [],
            'stats' => [
                'ongoing_count' => 0,
                'upcoming_count' => 0,
                'expired_count' => 0,
                'total_promo_sold' => 0,
            ],
            'filters' => [
                'status' => $request->query('status', 'ongoing'),
                'tab' => 'vouchers',
                'search' => $request->query('search', ''),
            ],
            'products' => $products,
            'vouchers' => $voucherData['vouchers'],
            'voucherStats' => $voucherData['voucherStats'],
            'voucherQuota' => $voucherData['voucherQuota'],
            'canAccessCampaignDiscounts' => $canAccessDiscounts,
            'canAccessVouchers' => true,
            'canEditVouchers' => $canEditVouchers,
            'canEditCampaignDiscounts' => $canEditCampaignDiscounts,
        ]);
    }

    /**
     * Create a new shop voucher.
     */
    public function store(SaveVoucherRequest $request)
    {
        $seller = $this->sellerOwner();
        $actor = $request->user();
        $validated = $request->validated();
        $isPrivileged = $actor->isSellerOwner() || $actor->isStaffManager();

        if (!$isPrivileged) {
            $validated['is_active'] = false;
            $voucher = $this->voucherService->createVoucher($seller, $validated);
            $payload = $this->ownerApprovalService->buildVoucherPayload($voucher);

            $this->ownerApprovalService->submitRequest(
                seller: $seller,
                requester: $actor,
                domain: OwnerApproval::DOMAIN_DISCOUNT,
                title: "Shop Voucher: {$voucher->code}",
                summary: "Staff submitted shop voucher {$voucher->code} ({$payload['discount_display']}) for review.",
                approvable: $voucher,
                payload: $payload
            );

            return redirect()->back()->with('success', 'Shop voucher submitted to shop owner for review.');
        }

        $this->voucherService->createVoucher($seller, $validated);

        return redirect()->back()->with('success', 'Shop voucher created successfully.');
    }

    /**
     * Update an existing shop voucher.
     */
    public function update(SaveVoucherRequest $request, Voucher $voucher)
    {
        $seller = $this->sellerOwner();
        $actor = $request->user();
        abort_unless((int) $voucher->shop_id === (int) $seller->id, 403, 'Unauthorized voucher modification.');
        abort_unless(
            $actor->isSellerOwner() || $actor->isStaffManager(),
            403,
            'Only the shop owner or shop manager can edit shop vouchers.'
        );

        $this->voucherService->updateVoucher($voucher, $request->validated());

        return redirect()->back()->with('success', 'Shop voucher updated successfully.');
    }

    /**
     * Deactivate a shop voucher.
     */
    public function destroy(Request $request, Voucher $voucher)
    {
        $seller = $this->sellerOwner();
        $actor = $request->user();
        abort_unless((int) $voucher->shop_id === (int) $seller->id, 403, 'Unauthorized voucher modification.');
        abort_unless(
            $actor->isSellerOwner() || $actor->isStaffManager(),
            403,
            'Only the shop owner or shop manager can deactivate shop vouchers.'
        );

        $this->voucherService->deactivateVoucher($voucher);

        return redirect()->back()->with('success', 'Shop voucher deactivated successfully.');
    }
}
