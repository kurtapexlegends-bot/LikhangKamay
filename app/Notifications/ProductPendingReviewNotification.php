<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ProductPendingReviewNotification extends Notification
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
        $shopName = $this->product->user?->shop_name ?: 'Unknown Artisan';
        return [
            'type' => 'product_moderation',
            'title' => 'Product Listing Pending Review',
            'message' => "Artisan \"{$shopName}\" submitted \"{$this->product->name}\" for review.",
            'url' => route('admin.catalog.index') . '?tab=moderation&product_status=pending_review',
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'shop_name' => $shopName,
        ];
    }
}
