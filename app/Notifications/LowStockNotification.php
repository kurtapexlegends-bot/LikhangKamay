<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Product;

class LowStockNotification extends Notification
{
    use Queueable;

    protected $product;

    /**
     * Create a new notification instance.
     */
    public function __construct(Product $product)
    {
        $this->product = $product;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        $channels = ['database'];
        if ($this->isNotifiableInactive($notifiable)) {
            $channels[] = 'mail';
        }
        return $channels;
    }

    protected function isNotifiableInactive(object $notifiable): bool
    {
        if ($notifiable instanceof \App\Models\User) {
            if ($notifiable->isStaff()) {
                return !$notifiable->isWorkspaceAccessEnabled() || $notifiable->isPlanWorkspaceSuspended();
            }
            if ($notifiable->isArtisan()) {
                return $notifiable->artisan_status !== 'approved';
            }
        }
        return false;
    }

    public function toMail(object $notifiable): \App\Mail\LowStockAlert
    {
        return (new \App\Mail\LowStockAlert($this->product))
            ->to($notifiable->email);
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'low_stock',
            'title' => 'Low Stock Alert',
            'message' => "Product \"{$this->product->name}\" is running low ({$this->product->stock} left).",
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'stock' => $this->product->stock,
            'url' => route('products.index'),
        ];
    }
}
