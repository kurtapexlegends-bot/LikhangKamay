<?php

namespace App\Notifications;

use App\Models\Review;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ArtisanReviewReplyNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Review $review,
        protected string $artisanName,
        protected string $productName,
    ) {
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'review_reply',
            'title' => 'Artisan Replied to Your Review',
            'message' => "{$this->artisanName} replied to your review on \"{$this->productName}\".",
            'review_id' => $this->review->id,
            'product_id' => $this->review->product_id,
            'product_name' => $this->productName,
            'artisan_name' => $this->artisanName,
            'url' => route('buyer.reviews', ['review' => $this->review->id]),
        ];
    }
}
