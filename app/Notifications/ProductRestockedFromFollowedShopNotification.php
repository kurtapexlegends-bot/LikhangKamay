<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class ProductRestockedFromFollowedShopNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Product $product
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $shopName = $this->product->user?->shop_name ?: ($this->product->user?->name ?: 'Artisan');
        return [
            'type' => 'followed_shop_product_restocked',
            'title' => 'Back in Stock at ' . $shopName,
            'message' => "\"{$this->product->name}\" from {$shopName} has been restocked!",
            'url' => route('products.show', $this->product->slug),
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'product_image' => $this->product->img ?? $this->product->image,
            'shop_name' => $shopName,
            'shop_id' => $this->product->user_id,
        ];
    }
}
