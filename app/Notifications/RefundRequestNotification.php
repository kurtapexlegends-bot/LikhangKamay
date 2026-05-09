<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class RefundRequestNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Order $order)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'refund_request',
            'title' => 'Action Required: Refund Request',
            'message' => "{$this->order->customer_name} has requested a refund/return for Order #{$this->order->order_number}. Please review the dispute.",
            'order_id' => $this->order->id,
            'url' => route('orders.index'), // Link to order management
        ];
    }
}
