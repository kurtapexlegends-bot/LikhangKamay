<?php

namespace App\Actions\Consumer;

use App\Models\Order;
use App\Models\User;
use App\Models\SellerActivityLog;
use App\Mail\ReturnRequested;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class RequestOrderReturn
{
    /**
     * Request return/refund for an order
     *
     * @param string $id
     * @param string $returnReason
     * @param string|null $proofPath
     * @param User $buyer
     * @return void
     */
    public function execute(string $id, string $returnReason, ?string $proofPath, User $buyer): void
    {
        DB::transaction(function () use ($id, $returnReason, $proofPath, $buyer) {
            $order = Order::lockForUpdate()->where('id', $id)
                ->where('user_id', $buyer->id)
                ->firstOrFail();

            if ($order->status !== 'Completed') {
                throw new \RuntimeException('This order is not completed.');
            }

            if (!$order->warranty_expires_at || now()->greaterThan($order->warranty_expires_at)) {
                throw new \RuntimeException('Return window has expired. Returns must be requested within 1 day of receiving your order.');
            }

            $updateData = [
                'status' => 'Refund/Return',
                'return_reason' => $returnReason
            ];

            if ($proofPath) {
                $updateData['return_proof_image'] = $proofPath;
            }

            $order->update($updateData);
            $order->refresh();

            $this->recordOrderAuditEvent(
                $order,
                $buyer,
                eventType: 'return_requested',
                severity: 'warning',
                title: 'Buyer Requested Return',
                summary: "{$order->order_number} was moved to return review.",
                status: 'refund_return',
                details: [
                    'before' => [
                        'status' => 'Completed',
                    ],
                    'after' => [
                        'status' => $order->status,
                        'return_reason' => $order->return_reason,
                    ],
                    'lines' => array_values(array_filter([
                        $order->return_reason ? "Reason: {$order->return_reason}" : null,
                        $proofPath ? 'Buyer submitted return proof image.' : null,
                    ])),
                ],
            );

            $order->load('items');
            $seller = User::find($order->artisan_id);
            if ($seller && $seller->email) {
                $this->sendMailSilently(
                    $seller->email,
                    new ReturnRequested($order),
                    'return_requested',
                    ['order_id' => $order->id, 'order_number' => $order->order_number]
                );
            }
        });
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
