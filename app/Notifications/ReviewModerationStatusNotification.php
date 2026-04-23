<?php

namespace App\Notifications;

use App\Models\Review;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ReviewModerationStatusNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Review $review,
        private readonly bool $isHiddenFromMarketplace,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $productName = $this->review->product?->name ?? 'your product review';

        return [
            'type' => 'review_moderation_status',
            'title' => $this->isHiddenFromMarketplace
                ? 'Review Hidden from Marketplace'
                : 'Review Remains Visible',
            'message' => $this->isHiddenFromMarketplace
                ? "After admin review, your review on \"{$productName}\" is now hidden from the marketplace."
                : "After admin review, your review on \"{$productName}\" remains visible in the marketplace.",
            'review_id' => $this->review->id,
            'product_id' => $this->review->product_id,
            'product_name' => $productName,
            'hidden_from_marketplace' => $this->isHiddenFromMarketplace,
            'url' => route('my-orders.index'),
        ];
    }
}
