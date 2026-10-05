<?php

namespace App\Observers;

use App\Actions\Audit\RecordAuditActivity;
use App\Models\Order;

class OrderAuditObserver
{
    /**
     * Handle the Order "updated" event for status tracking.
     */
    public function updated(Order $order): void
    {
        if ($order->wasChanged('status')) {
            app(RecordAuditActivity::class)->execute(
                action: 'order.status_changed',
                description: "Order #{$order->order_number} status changed from {$order->getOriginal('status')} to {$order->status}",
                subject: $order,
                diff: [
                    'order_number' => $order->order_number,
                    'artisan_id' => $order->artisan_id,
                    'buyer_id' => $order->user_id,
                    'before' => ['status' => $order->getOriginal('status')],
                    'after' => ['status' => $order->status],
                ],
                actorId: auth()->id() ?? $order->artisan_id,
            );
        }

        if ($order->wasChanged('payment_status')) {
            app(RecordAuditActivity::class)->execute(
                action: 'order.payment_status_changed',
                description: "Order #{$order->order_number} payment status updated from {$order->getOriginal('payment_status')} to {$order->payment_status}",
                subject: $order,
                diff: [
                    'order_number' => $order->order_number,
                    'artisan_id' => $order->artisan_id,
                    'buyer_id' => $order->user_id,
                    'before' => ['payment_status' => $order->getOriginal('payment_status')],
                    'after' => ['payment_status' => $order->payment_status],
                ],
                actorId: auth()->id() ?? $order->artisan_id,
            );
        }
    }
}
