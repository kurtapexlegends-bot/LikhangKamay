<?php

namespace App\Services;

use App\Models\FollowedShop;
use App\Models\Product;
use App\Models\User;
use App\Models\Wishlist;
use Illuminate\Support\Facades\DB;

class BuyerSignalService
{
    /**
     * Toggle a product in the user's wishlist database table.
     */
    public function toggleWishlist(User $user, int $productId): bool
    {
        $productExists = Product::approved()->where('id', $productId)->exists();
        if (!$productExists) {
            return false;
        }

        return DB::transaction(function () use ($user, $productId) {
            $existing = Wishlist::where('user_id', $user->id)
                ->where('product_id', $productId)
                ->first();

            if ($existing) {
                $existing->delete();
                return false; // Removed
            }

            Wishlist::create([
                'user_id' => $user->id,
                'product_id' => $productId,
            ]);

            return true; // Added
        });
    }

    /**
     * Toggle an artisan shop in the user's followed shops database table.
     */
    public function toggleFollowShop(User $user, int $shopId): bool
    {
        $shopExists = User::where('id', $shopId)
            ->where('role', 'artisan')
            ->where('artisan_status', 'approved')
            ->exists();

        if (!$shopExists || $user->id === $shopId) {
            return false;
        }

        return DB::transaction(function () use ($user, $shopId) {
            $existing = FollowedShop::where('user_id', $user->id)
                ->where('shop_id', $shopId)
                ->first();

            if ($existing) {
                $existing->delete();
                return false; // Unfollowed
            }

            FollowedShop::create([
                'user_id' => $user->id,
                'shop_id' => $shopId,
            ]);

            return true; // Followed
        });
    }

    /**
     * Sync local guest items into DB when a user logs in.
     */
    public function syncGuestSignals(User $user, array $productIds = [], array $shopIds = []): void
    {
        DB::transaction(function () use ($user, $productIds, $shopIds) {
            if (!empty($productIds)) {
                $validProductIds = Product::approved()
                    ->whereIn('id', $productIds)
                    ->pluck('id')
                    ->all();

                foreach ($validProductIds as $pid) {
                    Wishlist::firstOrCreate([
                        'user_id' => $user->id,
                        'product_id' => $pid,
                    ]);
                }
            }

            if (!empty($shopIds)) {
                $validShopIds = User::whereIn('id', $shopIds)
                    ->where('role', 'artisan')
                    ->where('artisan_status', 'approved')
                    ->where('id', '!=', $user->id)
                    ->pluck('id')
                    ->all();

                foreach ($validShopIds as $sid) {
                    FollowedShop::firstOrCreate([
                        'user_id' => $user->id,
                        'shop_id' => $sid,
                    ]);
                }
            }
        });
    }

    /**
     * Clear all wishlisted products for the user.
     */
    public function clearWishlist(User $user): void
    {
        Wishlist::where('user_id', $user->id)->delete();
    }

    /**
     * Clear all followed shops for the user.
     */
    public function clearFollowedShops(User $user): void
    {
        FollowedShop::where('user_id', $user->id)->delete();
    }

    /**
     * Get wishlisted products for the user formatted for the saved page.
     */
    public function getWishlistProductsForUser(User $user): array
    {
        return Wishlist::with(['product.user'])
            ->where('user_id', $user->id)
            ->whereHas('product', fn($q) => $q->approved())
            ->latest()
            ->get()
            ->map(function ($w) {
                $p = $w->product;
                return [
                    'id' => $p->id,
                    'slug' => $p->slug,
                    'name' => $p->name,
                    'image' => $p->img ?? $p->image ?? '/images/no-image.png',
                    'price' => (float) $p->price,
                    'sellerName' => $p->user?->shop_name ?? $p->user?->name ?? 'Artisan',
                    'sellerSlug' => $p->user?->shop_slug ?? null,
                    'category' => $p->category,
                ];
            })
            ->all();
    }

    /**
     * Get followed shops for the user formatted for the saved page.
     */
    public function getFollowedShopsForUser(User $user): array
    {
        return FollowedShop::with(['shop'])
            ->where('user_id', $user->id)
            ->whereHas('shop', fn($q) => $q->where('role', 'artisan')->where('artisan_status', 'approved'))
            ->latest()
            ->get()
            ->map(function ($fs) {
                $s = $fs->shop;
                return [
                    'id' => $s->id,
                    'slug' => $s->shop_slug,
                    'name' => $s->shop_name ?? $s->name,
                    'avatar' => $s->avatar,
                    'location' => $s->city ?? 'Philippines',
                    'joinedAt' => $s->created_at ? $s->created_at->format('Y-m-d') : null,
                ];
            })
            ->all();
    }
}
