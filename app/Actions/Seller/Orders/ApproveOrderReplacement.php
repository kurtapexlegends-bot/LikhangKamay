<?php

namespace App\Actions\Seller\Orders;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Models\SellerActivityLog;
use App\Notifications\ReplacementResolutionNotification;
use App\Services\OrderLogisticsService;
use Illuminate\Support\Facades\DB;

class ApproveOrderReplacement
{
    private $orderLogisticsService;

    public function __construct(OrderLogisticsService $orderLogisticsService)
    {
        $this->orderLogisticsService = $orderLogisticsService;
    }

    /**
     * Approve order replacement
     *
     * @param Order $order
     * @param string $resolutionDescription
     * @param User $actor
     * @param User|null $sellerOwner
     * @return string Status message
     */
    public function execute(Order $order, string $resolutionDescription, User $actor, ?User $sellerOwner): string
    {
        $shouldAutoBookReplacement = false;

        DB::transaction(function () use ($order, $resolutionDescription, &$shouldAutoBookReplacement) {
            $lockedOrder = Order::query()
                ->with(['items', 'user', 'delivery'])
                ->lockForUpdate()
                ->findOrFail($order->id);

            $buyer = $lockedOrder->user;

            if ($lockedOrder->status !== 'Refund/Return') {
                throw new \RuntimeException('This return request is no longer pending.');
            }

            foreach ($lockedOrder->items as $item) {
                $product = Product::lockForUpdate()->find($item->product_id);
                
                if (!$product || $product->stock < $item->quantity) {
                    throw new \RuntimeException("Insufficient stock to replace " . ($product ? $product->name : 'Unknown Product') . ". Requires {$item->quantity} but only " . ($product ? $product->stock : 0) . " left.");
                }
                
                $product->decrement('stock', $item->quantity);
                $product->refresh();
                if ($product->track_as_supply && $product->supply) {
                    $product->supply->update(['quantity' => $product->stock]);
                }
            }

            if ($lockedOrder->shipping_method === 'Delivery' && $lockedOrder->delivery) {
                $lockedOrder->delivery()->delete();
                $lockedOrder->unsetRelation('delivery');
            }

            $lockedOrder->update([
                'status' => 'Accepted',
                'accepted_at' => now(),
                'shipped_at' => null,
                'delivered_at' => null,
                'received_at' => null,
                'warranty_expires_at' => null,
                'tracking_number' => null,
                'shipping_notes' => null,
                'proof_of_delivery' => null,
                'replacement_resolution_description' => $resolutionDescription,
                'replacement_started_at' => now(),
                'replacement_resolved_at' => null,
            ]);

            $shouldAutoBookReplacement = $lockedOrder->shipping_method === 'Delivery';

            if ($buyer) {
                $buyer->notify(new ReplacementResolutionNotification($lockedOrder, $resolutionDescription));
            }
        });

        $message = 'Replacement approved. Buyer notified.';

        if ($shouldAutoBookReplacement) {
            $order->refresh();
            $order->loadMissing(['delivery', 'user']);

            try {
                $this->orderLogisticsService->bookLalamoveDelivery($order, $sellerOwner);
                $message = 'Replacement approved. Buyer notified and the replacement exchange courier was booked.';
            } catch (\Throwable $e) {
                report($e);
                $message = 'Replacement approved. Buyer notified. Courier rebooking could not be created automatically. Use Create Lalamove Delivery to retry.';
            }
        }

        $order->refresh();
        $order->loadMissing('user');

        $this->recordOrderAuditEvent(
            $order,
            $actor,
            eventType: 'replacement_approved',
            severity: 'info',
            title: 'Replacement Approved',
            summary: "{$order->order_number} entered the replacement workflow.",
            status: strtolower((string) $order->status),
            details: [
                'before' => [
                    'status' => 'Refund/Return',
                ],
                'after' => [
                    'status' => $order->status,
                    'replacement_started_at' => optional($order->replacement_started_at)?->toIso8601String(),
                ],
                'lines' => array_values(array_filter([
                    $resolutionDescription !== '' ? "Resolution: {$resolutionDescription}" : null,
                    $shouldAutoBookReplacement ? 'Replacement courier booking was attempted automatically.' : null,
                ])),
            ],
        );

        return $message;
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
}
