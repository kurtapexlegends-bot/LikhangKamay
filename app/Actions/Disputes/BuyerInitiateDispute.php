<?php

namespace App\Actions\Disputes;

use App\Models\Order;
use App\Models\Dispute;
use App\Models\User;
use App\Models\SellerActivityLog;
use App\Notifications\RefundRequestNotification;
use App\Mail\ReturnRequested;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Log;

class BuyerInitiateDispute
{
    /**
     * Execute buyer dispute initiation.
     *
     * @param string $orderId
     * @param string $reason
     * @param array $proofPhotos
     * @param int $buyerId
     * @return void
     * @throws \Exception
     */
    public function execute(string $orderId, string $reason, array $proofPhotos, int $buyerId): void
    {
        DB::transaction(function () use ($orderId, $reason, $proofPhotos, $buyerId) {
            $order = Order::lockForUpdate()->where('id', $orderId)
                ->where('user_id', $buyerId)
                ->firstOrFail();

            if ($order->status !== 'Completed') {
                throw new \Exception('This order is not completed.');
            }

            // Check 1-day warranty window
            if (!$order->received_at && $order->delivered_at) {
                $order->received_at = $order->delivered_at;
            }
            $warrantyExpires = $order->warranty_expires_at ?? ($order->received_at ? $order->received_at->addDay() : null);

            if (!$warrantyExpires || now()->greaterThan($warrantyExpires)) {
                throw new \Exception('Dispute window has expired. Disputes must be filed within 1 day of receiving the order.');
            }

            // Check if a dispute already exists for this order
            if (Dispute::where('order_id', $order->id)->exists()) {
                throw new \Exception('A dispute has already been filed for this order.');
            }

            // Store proof photos
            $paths = [];
            foreach ($proofPhotos as $file) {
                $paths[] = $file->store('disputes', 'public');
            }

            // Create Dispute record
            $dispute = Dispute::create([
                'order_id' => $order->id,
                'status' => 'pending',
                'reason' => $reason,
                'proof_photos' => $paths,
            ]);

            // Move order status to 'Refund/Return'
            $order->update([
                'status' => 'Refund/Return',
            ]);

            // Record audit log
            SellerActivityLog::recordEvent([
                'seller_owner_id' => $order->artisan_id,
                'actor_user_id' => $buyerId,
                'actor_type' => 'buyer',
                'category' => 'operations',
                'module' => 'orders',
                'event_type' => 'dispute_initiated',
                'severity' => 'warning',
                'status' => 'refund_return',
                'title' => 'Dispute Initiated',
                'summary' => "Buyer filed dispute for Order #{$order->order_number}.",
                'subject_type' => Order::class,
                'subject_id' => $order->id,
                'subject_label' => $order->order_number,
                'reference' => $order->customer_name,
                'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
            ]);

            // Notify seller
            $seller = User::find($order->artisan_id);
            if ($seller) {
                $seller->notify(new RefundRequestNotification($order));
                $this->sendMailSilently($seller->email, new ReturnRequested($order));
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
