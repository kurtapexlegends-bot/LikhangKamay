<?php

namespace App\Actions\Disputes;

use App\Models\Order;
use App\Models\Dispute;
use App\Models\Product;
use App\Models\User;
use App\Models\SellerActivityLog;
use App\Notifications\DisputeStatusNotification;
use App\Notifications\ReplacementResolutionNotification;
use App\Services\OrderLogisticsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BuyerReactToDispute
{
    /**
     * Execute buyer reaction.
     *
     * @param string $disputeId
     * @param string $actionType
     * @param string|null $escalationReason
     * @param int $buyerId
     * @return void
     * @throws \Exception
     */
    public function execute(string $disputeId, string $actionType, ?string $escalationReason, int $buyerId): void
    {
        DB::transaction(function () use ($disputeId, $actionType, $escalationReason, $buyerId) {
            $dispute = Dispute::lockForUpdate()->findOrFail($disputeId);
            $order = Order::lockForUpdate()->findOrFail($dispute->order_id);

            if ($order->user_id !== $buyerId) {
                abort(403, 'Unauthorized.');
            }

            if ($actionType === 'accept_replacement') {
                $this->handleReplacementAcceptance($dispute, $order, $buyerId);
            } elseif ($actionType === 'escalate') {
                $this->handleDisputeEscalation($dispute, $order, $escalationReason, $buyerId);
            }
        });
    }

    /**
     * Handle replacement acceptance logic.
     */
    private function handleReplacementAcceptance(Dispute $dispute, Order $order, int $buyerId): void
    {
        if ($dispute->status !== 'seller_proposed_replacement') {
            throw new \Exception('No replacement offer exists for this dispute.');
        }

        // Decrement stock for items
        $order->load('items');
        foreach ($order->items as $item) {
            $product = Product::lockForUpdate()->find($item->product_id);
            if (!$product || $product->stock < $item->quantity) {
                throw new \Exception("Insufficient stock to replace " . ($product ? $product->name : 'Unknown Product') . ".");
            }
            $product->decrement('stock', $item->quantity);
            $product->refresh();
            if ($product->track_as_supply && $product->supply) {
                $product->supply->update(['quantity' => $product->stock]);
            }
        }

        // Delete existing delivery if necessary
        if ($order->shipping_method === 'Delivery' && $order->delivery) {
            $order->delivery()->delete();
            $order->unsetRelation('delivery');
        }

        // Reset order status to 'Accepted' for delivery
        $order->update([
            'status' => 'Accepted',
            'accepted_at' => now(),
            'shipped_at' => null,
            'delivered_at' => null,
            'received_at' => null,
            'warranty_expires_at' => null,
            'tracking_number' => null,
            'shipping_notes' => null,
            'proof_of_delivery' => null,
            'replacement_resolution_description' => $dispute->seller_proposed_description,
            'replacement_started_at' => now(),
            'replacement_resolved_at' => null,
        ]);

        // Resolve dispute
        $dispute->update([
            'status' => 'resolved_replacement',
            'resolved_at' => now(),
        ]);

        // Attempt auto-booking
        if ($order->shipping_method === 'Delivery') {
            try {
                $seller = User::find($order->artisan_id);
                app(OrderLogisticsService::class)->bookLalamoveDelivery($order, $seller);
            } catch (\Throwable $e) {
                Log::warning("Failed to auto-book Lalamove: " . $e->getMessage());
            }
        }

        // Record audit log
        SellerActivityLog::recordEvent([
            'seller_owner_id' => $order->artisan_id,
            'actor_user_id' => $buyerId,
            'actor_type' => 'buyer',
            'category' => 'operations',
            'module' => 'orders',
            'event_type' => 'dispute_replacement_accepted',
            'severity' => 'info',
            'status' => 'accepted',
            'title' => 'Replacement Accepted',
            'summary' => "Buyer accepted replacement for Order #{$order->order_number}.",
            'subject_type' => Order::class,
            'subject_id' => $order->id,
            'subject_label' => $order->order_number,
            'reference' => $order->customer_name,
            'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
        ]);

        // Notify seller
        $seller = User::find($order->artisan_id);
        if ($seller) {
            $seller->notify(new ReplacementResolutionNotification($order, $dispute->seller_proposed_description ?? ''));
        }
    }

    /**
     * Handle dispute escalation.
     */
    private function handleDisputeEscalation(Dispute $dispute, Order $order, ?string $escalationReason, int $buyerId): void
    {
        if (!in_array($dispute->status, ['seller_proposed_replacement', 'seller_rejected'])) {
            throw new \Exception('You cannot escalate this dispute yet.');
        }

        $dispute->update([
            'status' => 'escalated',
            'escalation_reason' => $escalationReason,
        ]);

        // Record audit log
        SellerActivityLog::recordEvent([
            'seller_owner_id' => $order->artisan_id,
            'actor_user_id' => $buyerId,
            'actor_type' => 'buyer',
            'category' => 'operations',
            'module' => 'orders',
            'event_type' => 'dispute_escalated',
            'severity' => 'warning',
            'status' => 'refund_return',
            'title' => 'Dispute Escalated',
            'summary' => "Buyer escalated dispute for Order #{$order->order_number}.",
            'subject_type' => Order::class,
            'subject_id' => $order->id,
            'subject_label' => $order->order_number,
            'reference' => $order->customer_name,
            'amount_label' => 'PHP ' . number_format((float) $order->total_amount, 2),
        ]);

        // Notify super admins
        $admins = User::where('role', 'super_admin')->get();
        foreach ($admins as $admin) {
            $admin->notify(new DisputeStatusNotification(
                'dispute_escalated',
                'New Escalation Queue',
                "Order #{$order->order_number} has been escalated for dispute arbitration.",
                route('admin.disputes.index')
            ));
            if ($admin->email) {
                try {
                    \Illuminate\Support\Facades\Mail::to($admin->email)->send(new \App\Mail\DisputeEscalated($order, $escalationReason ?? 'No reason provided.'));
                } catch (\Throwable $e) {
                    \Illuminate\Support\Facades\Log::warning("Failed to send dispute escalation mail to Admin: " . $e->getMessage());
                }
            }
        }
    }
}
