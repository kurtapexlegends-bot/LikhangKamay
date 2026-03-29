<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ReplacementResolutionNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Order $order,
        private readonly string $resolutionDescription,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'replacement_resolution',
            'title' => 'Replacement Approved',
            'message' => "Order #{$this->order->order_number}: {$this->resolutionDescription}",
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
            'resolution_description' => $this->resolutionDescription,
            'url' => route('my-orders.index'),
        ];
    }
}
