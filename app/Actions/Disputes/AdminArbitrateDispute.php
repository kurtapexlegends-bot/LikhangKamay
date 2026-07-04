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
use Illuminate\Support\Facades\Gate;

class AdminArbitrateDispute
{
    /**
     * Execute admin arbitration.
     *
     * @param string $disputeId
     * @param string $decision
     * @param string $adminNotes
     * @param User $actor
     * @return void
     * @throws \Exception
     */
    public function execute(string $disputeId, string $decision, string $adminNotes, User $actor): void
    {
        Gate::authorize('admin-action');

        DB::transaction(function () use ($disputeId, $decision, $adminNotes, $actor) {
            $dispute = Dispute::lockForUpdate()->findOrFail($disputeId);
            $order = Order::lockForUpdate()->findOrFail($dispute->order_id);

            if ($dispute->status !== 'escalated') {
                throw new \Exception('This dispute is not escalated for arbitration.');
            }

            if ($decision === 'refund') {
                // Refund order
                $dispute->update([
                    'status' => 'resolved_refunded',
                    'admin_decision' => 'refund',
                    'admin_notes' => $adminNotes,
                    'resolved_at' => now(),
                ]);

                $order->update([
                    'status' => 'Refunded',
                    'payment_status' => 'refunded',
                ]);

                // Notify buyer and seller
                $buyer = $order->user;
                if ($buyer) {
                    $buyer->notify(new DisputeStatusNotification(
                        'dispute_arbitrated_refund',
                        'Dispute Resolved: Refunded',
                        "Platform administrator has ruled in favor of refund for Order #{$order->order_number}.",
                        route('my-orders.index')
                    ));
                    $this->sendMailSilently($buyer->email, new RefundProcessed($order));
                }

                $seller = User::find($order->artisan_id);
                if ($seller) {
                    $seller->notify(new DisputeStatusNotification(
                        'dispute_arbitrated_refund',
                        'Dispute Arbitrated: Refunded',
                        "Platform administrator has ruled in favor of buyer refund for Order #{$order->order_number}.",
                        route('orders.index')
                    ));
                }

                // Log activity
                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $order->artisan_id,
                    'actor_user_id' => $actor->id,
                    'actor_type' => 'system',
                    'category' => 'operations',
                    'module' => 'orders',
                    'event_type' => 'dispute_arbitrated_refund',
                    'severity' => 'warning',
                    'status' => 'refunded',
                    'title' => 'Admin Ruled Refund',
                    'summary' => "Admin arbitrated dispute in favor of Refund for Order #{$order->order_number}.",
                    'subject_type' => Order::class,
                    'subject_id' => $order->id,
                    'subject_label' => $order->order_number,
                    'reference' => $order->customer_name,
                    'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                ]);
            } elseif ($decision === 'reject') {
                // Reject claim, restore order status back to Completed
                $dispute->update([
                    'status' => 'resolved_rejected',
                    'admin_decision' => 'reject',
                    'admin_notes' => $adminNotes,
                    'resolved_at' => now(),
                ]);

                $order->update([
                    'status' => 'Completed',
                ]);

                // Notify buyer and seller
                $buyer = $order->user;
                if ($buyer) {
                    $buyer->notify(new DisputeStatusNotification(
                        'dispute_arbitrated_rejected',
                        'Dispute Resolved: Claim Rejected',
                        "Platform administrator has rejected the return claim for Order #{$order->order_number}.",
                        route('my-orders.index')
                    ));
                    $this->sendMailSilently($buyer->email, new \App\Mail\DisputeArbitratedSellerWins($order, $adminNotes));
                }

                $seller = User::find($order->artisan_id);
                if ($seller) {
                    $seller->notify(new DisputeStatusNotification(
                        'dispute_arbitrated_rejected',
                        'Dispute Arbitrated: Rejected',
                        "Platform administrator has ruled in favor of seller for Order #{$order->order_number}.",
                        route('orders.index')
                    ));
                }

                // Log activity
                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $order->artisan_id,
                    'actor_user_id' => $actor->id,
                    'actor_type' => 'system',
                    'category' => 'operations',
                    'module' => 'orders',
                    'event_type' => 'dispute_arbitrated_rejected',
                    'severity' => 'info',
                    'status' => 'completed',
                    'title' => 'Admin Ruled Rejection',
                    'summary' => "Admin arbitrated dispute in favor of Seller for Order #{$order->order_number}.",
                    'subject_type' => Order::class,
                    'subject_id' => $order->id,
                    'subject_label' => $order->order_number,
                    'reference' => $order->customer_name,
                    'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
                ]);
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
