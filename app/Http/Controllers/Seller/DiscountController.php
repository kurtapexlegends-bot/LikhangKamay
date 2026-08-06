<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Http\Requests\Seller\CreateDiscountRequest;
use App\Models\Discount;
use App\Models\Product;
use App\Services\DiscountService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DiscountController extends Controller
{
    use InteractsWithSellerContext;

    protected DiscountService $discountService;

    public function __construct(DiscountService $discountService)
    {
        $this->discountService = $discountService;
    }

    /**
     * Display seller discounts list / Marketing Dashboard.
     */
    public function index(Request $request)
    {
        $sellerId = $this->sellerOwnerId();
        $now = now();

        $query = Discount::where('user_id', $sellerId)
            ->with(['products:id,name,price,sku,cover_photo_path,status']);

        $statusFilter = $request->query('status', 'ongoing');

        if ($statusFilter === 'ongoing') {
            $query->where('is_active', true)
                  ->where('start_at', '<=', $now)
                  ->where('end_at', '>=', $now);
        } elseif ($statusFilter === 'upcoming') {
            $query->where('is_active', true)
                  ->where('start_at', '>', $now);
        } elseif ($statusFilter === 'expired') {
            $query->where(function ($q) use ($now) {
                $q->where('is_active', false)
                  ->orWhere('end_at', '<', $now);
            });
        }

        $discounts = $query->latest()->paginate(15)->withQueryString();

        $stats = [
            'ongoing_count' => Discount::where('user_id', $sellerId)->active()->count(),
            'upcoming_count' => Discount::where('user_id', $sellerId)->where('is_active', true)->where('start_at', '>', $now)->count(),
            'expired_count' => Discount::where('user_id', $sellerId)->where(function ($q) use ($now) {
                $q->where('is_active', false)->orWhere('end_at', '<', $now);
            })->count(),
            'total_promo_sold' => (int) Discount::where('user_id', $sellerId)->sum('promo_sold'),
        ];

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json([
                'success' => true,
                'discounts' => $discounts,
                'stats' => $stats,
            ]);
        }

        $products = Product::where('user_id', $sellerId)
            ->select('id', 'name', 'price', 'sku', 'cover_photo_path', 'stock', 'status')
            ->latest()
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'price' => (float) $p->price,
                'sku' => $p->sku,
                'stock' => (int) $p->stock,
                'img' => $p->cover_photo_path ? (str_starts_with($p->cover_photo_path, 'http') ? $p->cover_photo_path : "/storage/{$p->cover_photo_path}") : '/images/no-image.png',
            ]);

        return Inertia::render('Seller/Marketing/DiscountManager', [
            'discounts' => $discounts,
            'stats' => $stats,
            'filters' => [
                'status' => $statusFilter,
            ],
            'products' => $products,
        ]);
    }

    /**
     * Create and apply a new discount to selected products.
     */
    public function store(CreateDiscountRequest $request)
    {
        $seller = $this->sellerOwner();
        $validated = $request->validated();

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
        $sellerId = $this->sellerOwnerId();

        if ($discount->user_id !== $sellerId) {
            abort(403, 'Unauthorized discount modification.');
        }

        $validated = $request->validated();
        $this->discountService->updateDiscount($discount, $validated);

        return redirect()->back()->with('success', 'Discount campaign updated successfully.');
    }

    /**
     * Cancel / deactivate a discount.
     */
    public function destroy(Request $request, Discount $discount)
    {
        $sellerId = $this->sellerOwnerId();

        if ($discount->user_id !== $sellerId) {
            abort(403, 'Unauthorized discount modification.');
        }

        $this->discountService->deactivateDiscount($discount);

        return redirect()->back()->with('success', 'Discount deactivated successfully.');
    }
}
