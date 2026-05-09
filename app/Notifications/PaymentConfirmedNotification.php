<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class PaymentConfirmedNotification extends Notification
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
            'type' => 'payment_confirmed',
            'title' => 'Funds Secured: Start Crafting',
            'message' => "Payment for Order #{$this->order->order_number} has been verified. You can now safeley begin production.",
            'order_id' => $this->order->id,
            'url' => route('orders.index'),
        ];
    }
}
