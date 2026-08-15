<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class NewProductFromFollowedShopNotification extends Notification implements ShouldQueue
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
            'type' => 'followed_shop_new_product',
            'title' => 'New Release from ' . $shopName,
            'message' => "{$shopName} just published a new piece: \"{$this->product->name}\".",
            'url' => route('products.show', $this->product->slug),
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'product_image' => $this->product->img ?? $this->product->image,
            'shop_name' => $shopName,
            'shop_id' => $this->product->user_id,
        ];
    }
}
