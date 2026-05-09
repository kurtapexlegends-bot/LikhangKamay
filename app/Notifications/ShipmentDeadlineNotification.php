<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ShipmentDeadlineNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Order $order, private readonly int $hoursRemaining)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'shipment_deadline',
            'title' => 'Urgent: Shipment Deadline',
            'message' => "Order #{$this->order->order_number} will auto-cancel in {$this->hoursRemaining} hours if not marked as Shipped.",
            'order_id' => $this->order->id,
            'url' => route('orders.index'),
        ];
    }
}
