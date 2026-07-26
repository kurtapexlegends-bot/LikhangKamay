<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Services\BuyerSignalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BuyerSignalController extends Controller
{
    public function __construct(
        protected BuyerSignalService $buyerSignalService
    ) {}

    /**
     * Get wishlisted product IDs and followed shop IDs for authenticated user.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'wishlist' => $this->buyerSignalService->getWishlistProductsForUser($user),
            'followedShops' => $this->buyerSignalService->getFollowedShopsForUser($user),
        ]);
    }

    /**
     * Toggle wishlist item for authenticated user.
     */
    public function toggleWishlist(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => ['required', 'integer'],
        ]);

        $added = $this->buyerSignalService->toggleWishlist(
            $request->user(),
            (int) $request->input('product_id')
        );

        return response()->json([
            'success' => true,
            'is_wishlisted' => $added,
            'message' => $added ? 'Product saved to wishlist.' : 'Product removed from wishlist.',
        ]);
    }

    /**
     * Toggle followed shop for authenticated user.
     */
    public function toggleFollowShop(Request $request): JsonResponse
    {
        $request->validate([
            'shop_id' => ['required', 'integer'],
        ]);

        $followed = $this->buyerSignalService->toggleFollowShop(
            $request->user(),
            (int) $request->input('shop_id')
        );

        return response()->json([
            'success' => true,
            'is_followed' => $followed,
            'message' => $followed ? 'Shop followed.' : 'Shop unfollowed.',
        ]);
    }

    /**
     * Sync guest local signals to database on login.
     */
    public function sync(Request $request): JsonResponse
    {
        $request->validate([
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer'],
            'shop_ids' => ['nullable', 'array'],
            'shop_ids.*' => ['integer'],
        ]);

        $this->buyerSignalService->syncGuestSignals(
            $request->user(),
            $request->input('product_ids', []),
            $request->input('shop_ids', [])
        );

        return response()->json([
            'success' => true,
            'wishlist' => $this->buyerSignalService->getWishlistProductsForUser($request->user()),
            'followedShops' => $this->buyerSignalService->getFollowedShopsForUser($request->user()),
        ]);
    }

    /**
     * Clear wishlisted items.
     */
    public function clearWishlist(Request $request): JsonResponse
    {
        $this->buyerSignalService->clearWishlist($request->user());

        return response()->json([
            'success' => true,
            'message' => 'Wishlist cleared.',
        ]);
    }

    /**
     * Clear followed shops.
     */
    public function clearFollowedShops(Request $request): JsonResponse
    {
        $this->buyerSignalService->clearFollowedShops($request->user());

        return response()->json([
            'success' => true,
            'message' => 'Followed shops cleared.',
        ]);
    }
}
