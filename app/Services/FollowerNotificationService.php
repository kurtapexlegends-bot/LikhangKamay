<?php

namespace App\Services;

use App\Models\FollowedShop;
use App\Models\Product;
use App\Models\User;
use App\Notifications\NewProductFromFollowedShopNotification;
use App\Notifications\ProductRestockedFromFollowedShopNotification;
use Illuminate\Support\Facades\Notification;

class FollowerNotificationService
{
    /**
     * Notify all followers of an artisan when a new active product is published or approved.
     */
    public function notifyFollowersOfNewProduct(Product $product): int
    {
        $sellerId = $product->user_id;
        if (!$sellerId || $product->status !== 'Active') {
            return 0;
        }

        $followerIds = FollowedShop::where('shop_id', $sellerId)
            ->pluck('user_id')
            ->all();

        if (empty($followerIds)) {
            return 0;
        }

        $product->loadMissing('user');

        User::whereIn('id', $followerIds)
            ->chunkById(100, function ($followers) use ($product) {
                Notification::send($followers, new NewProductFromFollowedShopNotification($product));
            });

        return count($followerIds);
    }

    /**
     * Notify all followers of an artisan when an active product is restocked.
     */
    public function notifyFollowersOfRestock(Product $product): int
    {
        $sellerId = $product->user_id;
        if (!$sellerId || $product->status !== 'Active') {
            return 0;
        }

        $followerIds = FollowedShop::where('shop_id', $sellerId)
            ->pluck('user_id')
            ->all();

        if (empty($followerIds)) {
            return 0;
        }

        $product->loadMissing('user');

        User::whereIn('id', $followerIds)
            ->chunkById(100, function ($followers) use ($product) {
                Notification::send($followers, new ProductRestockedFromFollowedShopNotification($product));
            });

        return count($followerIds);
    }
}
