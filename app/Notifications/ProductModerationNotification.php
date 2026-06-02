<?php

namespace App\Notifications;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ProductModerationNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected Product $product,
        protected string $status, // approved, rejected, flagged
        protected ?string $feedback = null
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $statusKey = match($this->status) {
            'approve', 'approved' => 'approved',
            'reject', 'rejected' => 'rejected',
            'flag', 'flagged' => 'flagged',
            default => $this->status,
        };

        $statusLabel = match($statusKey) {
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            'flagged' => 'Flagged',
            default => ucfirst($statusKey),
        };

        $message = match($statusKey) {
            'approved' => "Your product listing for '{$this->product->name}' has been approved and is now active in the marketplace.",
            'rejected' => "Your product listing for '{$this->product->name}' was rejected. Feedback: " . ($this->feedback ?: 'No feedback provided.'),
            'flagged' => "Your product listing for '{$this->product->name}' has been flagged. Feedback: " . ($this->feedback ?: 'Please review marketplace guidelines.'),
            default => "Your product listing for '{$this->product->name}' status updated to {$statusLabel}.",
        };

        return [
            'type' => 'product_moderation',
            'title' => "Listing {$statusLabel}",
            'message' => $message,
            'url' => route('products.index'),
            'product_id' => $this->product->id,
            'status' => $this->status,
            'rejection_reason' => $this->feedback,
        ];
    }
}
