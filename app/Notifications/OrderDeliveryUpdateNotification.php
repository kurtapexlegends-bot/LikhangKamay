<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OrderDeliveryUpdateNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Order $order,
        private readonly string $title,
        private readonly string $message,
        private readonly string $url,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'delivery_update',
            'title' => $this->title,
            'message' => $this->message,
            'url' => $this->url,
            'order_id' => $this->order->id,
            'order_number' => $this->order->order_number,
        ];
    }
}
