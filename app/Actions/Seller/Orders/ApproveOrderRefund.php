<?php

namespace App\Actions\Seller\Orders;

use App\Models\Order;
use App\Models\User;
use App\Models\SellerActivityLog;
use App\Mail\RefundProcessed;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ApproveOrderRefund
{
    /**
     * Approve order refund
     *
     * @param Order $order
     * @param User $actor
     * @return void
     */
    public function execute(Order $order, User $actor): void
    {
        DB::transaction(function () use ($order) {
            $lockedOrder = Order::query()
                ->with('user')
                ->lockForUpdate()
                ->findOrFail($order->id);

            if ($lockedOrder->status !== 'Refund/Return') {
                throw new \RuntimeException('This return request is no longer pending.');
            }

            $lockedOrder->update([
                'status' => 'Refunded',
                'payment_status' => 'refunded',
            ]);
        });

        $order->refresh();
        $order->loadMissing('user');

        $this->recordOrderAuditEvent(
            $order,
            $actor,
            eventType: 'return_refunded',
            severity: 'warning',
            title: 'Return Refunded',
            summary: "{$order->order_number} was approved for refund.",
            status: 'refunded',
            details: [
                'before' => [
                    'status' => 'Refund/Return',
                ],
                'after' => [
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                ],
                'lines' => ['Seller approved the buyer return request for refund.'],
            ],
        );

        try {
            $buyer = $order->user;
            if ($buyer && $buyer->email) {
                $this->sendMailSilently(
                    $buyer->email,
                    new RefundProcessed($order),
                    'refund_processed',
                    ['order_id' => $order->id, 'order_number' => $order->order_number]
                );
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

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

    private function sendMailSilently(string $recipient, \Illuminate\Mail\Mailable $mailable, string $context, array $extraContext = []): void
    {
        try {
            $mailer = Mail::to($recipient);
            if (app()->environment('production') && config('queue.default') !== 'sync') {
                $mailer->queue($mailable);
            } else {
                $mailer->send($mailable);
            }
        } catch (\Throwable $exception) {
            report($exception);
            Log::error('Transactional mail send failed.', [
                'context' => $context,
                'recipient' => $recipient,
                'message' => $exception->getMessage(),
                ...$extraContext,
            ]);
        }
    }
}
