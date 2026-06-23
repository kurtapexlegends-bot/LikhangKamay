<?php

declare(strict_types=1);

namespace App\Actions\Seller\Orders;

use App\Models\Order;
use App\Models\User;
use App\Models\SellerActivityLog;
use Illuminate\Support\Facades\DB;

class MarkOrderAsPaid
{
    /**
     * Mark a COD order as paid manually
     *
     * @param Order $order
     * @param User $actor
     * @return void
     * @throws \Exception
     */
    public function execute(Order $order, User $actor): void
    {
        DB::transaction(function () use ($order) {
            $lockedOrder = Order::lockForUpdate()->findOrFail($order->id);

            if ($lockedOrder->payment_method !== 'COD') {
                throw new \Exception('Only cash on delivery orders can be marked paid manually.');
            }

            if (in_array($lockedOrder->status, ['Refunded', 'Cancelled', 'Rejected'], true)) {
                throw new \Exception('Payment status can no longer be changed for this order.');
            }

            if ($lockedOrder->payment_status === 'paid') {
                return;
            }

            $lockedOrder->update(['payment_status' => 'paid']);
        });

        $order->refresh();

        $this->recordOrderAuditEvent(
            $order,
            $actor,
            eventType: 'payment_status_updated',
            severity: 'info',
            title: 'Order Payment Updated',
            summary: "{$order->order_number} was manually marked as paid.",
            status: 'paid',
            details: [
                'before' => [
                    'payment_status' => 'pending',
                ],
                'after' => [
                    'payment_status' => 'paid',
                ],
                'lines' => ['Manual COD payment confirmation was applied.'],
            ],
        );
    }

    /**
     * Record order audit event
     */
    private function recordOrderAuditEvent(
        Order $order,
        ?User $actor,
        string $eventType,
        string $severity,
        string $title,
        string $summary,
        string $status,
        array $details = [],
    ): void {
        SellerActivityLog::recordEvent([
            'seller_owner_id' => $order->artisan_id,
            'actor_user_id' => $actor?->id,
            'actor_type' => SellerActivityLog::resolveActorType($actor, 'system'),
            'category' => 'operations',
            'module' => 'orders',
            'event_type' => $eventType,
            'severity' => $severity,
            'status' => $status,
            'title' => $title,
            'summary' => $summary,
            'subject_type' => Order::class,
            'subject_id' => $order->id,
            'subject_label' => $order->order_number,
            'reference' => $order->customer_name,
            'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
            'details' => $details,
            'target_url' => route('orders.index', ['highlight_order' => $order->order_number]),
            'target_label' => 'Open Orders',
        ]);
    }
}
