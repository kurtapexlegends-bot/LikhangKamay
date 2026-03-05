<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Review;

class NewReviewNotification extends Notification
{
    use Queueable;

    protected $review;
    protected $productName;
    protected $buyerName;

    /**
     * Create a new notification instance.
     */
    public function __construct(Review $review, string $productName, string $buyerName)
    {
        $this->review = $review;
        $this->productName = $productName;
        $this->buyerName = $buyerName;
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
            'type' => 'new_review',
            'title' => 'New Review',
            'message' => "{$this->buyerName} left a {$this->review->rating}-star review on \"{$this->productName}\".",
            'review_id' => $this->review->id,
            'product_name' => $this->productName,
            'rating' => $this->review->rating,
            'url' => route('reviews.index'),
        ];
    }
}
