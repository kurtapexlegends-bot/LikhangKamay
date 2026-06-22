<?php

namespace App\Actions\Disputes;

use App\Models\Order;
use App\Models\Dispute;
use App\Models\User;
use App\Models\SellerActivityLog;
use App\Notifications\DisputeStatusNotification;
use App\Mail\RefundProcessed;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class SellerRespondToDispute
{
    /**
     * Execute seller response to dispute.
     *
     * @param string $disputeId
     * @param string $responseType
     * @param string|null $sellerExplanation
     * @param string|null $sellerProposedDescription
     * @param User $actor
     * @return void
     * @throws \Exception
     */
    public function execute(
        string $disputeId,
        string $responseType,
        ?string $sellerExplanation,
        ?string $sellerProposedDescription,
        User $actor
    ): void {
        DB::transaction(function () use (
            $disputeId,
            $responseType,
            $sellerExplanation,
            $sellerProposedDescription,
            $actor
        ) {
            $dispute = Dispute::lockForUpdate()->findOrFail($disputeId);
            $order = Order::lockForUpdate()->findOrFail($dispute->order_id);

            // Authenticate seller (owner or authorized staff)
            $effectiveSellerId = $actor->getEffectiveSellerId();
            if ($order->artisan_id !== $effectiveSellerId) {
                abort(403, 'Unauthorized.');
            }

            if ($dispute->status !== 'pending') {
                throw new \Exception('This dispute is no longer pending.');
            }

            if ($responseType === 'accept') {
                // Update dispute
                $dispute->update([
                    'status' => 'seller_accepted',
                    'seller_response_type' => 'refund',
                    'resolved_at' => now(),
                ]);

                // Update order
                $order->update([
                    'status' => 'Refunded',
                    'payment_status' => 'refunded',
                ]);

                // Record audit log
                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $order->artisan_id,
                    'actor_user_id' => $actor->id,
                    'actor_type' => SellerActivityLog::resolveActorType($actor, 'seller'),
                    'category' => 'operations',
                    'module' => 'orders',
                    'event_type' => 'dispute_accepted',
                    'severity' => 'info',
                    'status' => 'refunded',
                    'title' => 'Dispute Accepted',
                    'summary' => "Seller accepted refund request for Order #{$order->order_number}.",
                    'subject_type' => Order::class,
                    'subject_id' => $order->id,
                    'subject_label' => $order->order_number,
                    'reference' => $order->customer_name,
                    'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                ]);

                // Notify buyer
                $buyer = $order->user;
                if ($buyer) {
                    $buyer->notify(new DisputeStatusNotification(
                        'dispute_accepted',
                        'Dispute Request Approved',
                        "Seller approved refund for Order #{$order->order_number}.",
                        route('my-orders.index')
                    ));
                    $this->sendMailSilently($buyer->email, new RefundProcessed($order));
                }
            } elseif ($responseType === 'replacement') {
                // Update dispute
                $dispute->update([
                    'status' => 'seller_proposed_replacement',
                    'seller_response_type' => 'replacement',
                    'seller_proposed_description' => $sellerProposedDescription,
                ]);

                // Record audit log
                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $order->artisan_id,
                    'actor_user_id' => $actor->id,
                    'actor_type' => SellerActivityLog::resolveActorType($actor, 'seller'),
                    'category' => 'operations',
                    'module' => 'orders',
                    'event_type' => 'dispute_replacement_proposed',
                    'severity' => 'info',
                    'status' => 'refund_return',
                    'title' => 'Replacement Proposed',
                    'summary' => "Seller proposed replacement exchange for Order #{$order->order_number}.",
                    'subject_type' => Order::class,
                    'subject_id' => $order->id,
                    'subject_label' => $order->order_number,
                    'reference' => $order->customer_name,
                    'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                ]);

                // Notify buyer
                $buyer = $order->user;
                if ($buyer) {
                    $buyer->notify(new DisputeStatusNotification(
                        'dispute_replacement_proposed',
                        'Replacement Exchange Proposed',
                        "Seller proposed a replacement option for Order #{$order->order_number}.",
                        route('my-orders.index')
                    ));
                }
            } elseif ($responseType === 'reject') {
                // Update dispute
                $dispute->update([
                    'status' => 'seller_rejected',
                    'seller_response_type' => 'reject',
                    'seller_explanation' => $sellerExplanation,
                ]);

                // Record audit log
                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $order->artisan_id,
                    'actor_user_id' => $actor->id,
                    'actor_type' => SellerActivityLog::resolveActorType($actor, 'seller'),
                    'category' => 'operations',
                    'module' => 'orders',
                    'event_type' => 'dispute_rejected',
                    'severity' => 'warning',
                    'status' => 'refund_return',
                    'title' => 'Dispute Rejected by Seller',
                    'summary' => "Seller rejected return request for Order #{$order->order_number}.",
                    'subject_type' => Order::class,
                    'subject_id' => $order->id,
                    'subject_label' => $order->order_number,
                    'reference' => $order->customer_name,
                    'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                ]);

                // Notify buyer
                $buyer = $order->user;
                if ($buyer) {
                    $buyer->notify(new DisputeStatusNotification(
                        'dispute_rejected',
                        'Dispute Request Rejected',
                        "Seller rejected the return request for Order #{$order->order_number}. You can escalate to admin support.",
                        route('my-orders.index')
                    ));
                }
            }
        });
    }

    /**
     * Send email silently.
     */
    private function sendMailSilently(string $recipient, \Illuminate\Mail\Mailable $mailable): void
    {
        try {
            Mail::to($recipient)->send($mailable);
        } catch (\Throwable $e) {
            Log::warning("Failed to send mail to {$recipient}: " . $e->getMessage());
        }
    }
}
