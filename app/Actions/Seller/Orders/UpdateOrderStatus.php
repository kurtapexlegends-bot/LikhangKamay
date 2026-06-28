<?php

namespace App\Actions\Seller\Orders;

use App\Models\Order;
use App\Models\User;
use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Mail\OrderAccepted;
use App\Mail\OrderShipped;
use App\Services\OrderFinanceService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class UpdateOrderStatus
{
    private $orderFinanceService;

    public function __construct(OrderFinanceService $orderFinanceService)
    {
        $this->orderFinanceService = $orderFinanceService;
    }

    /**
     * Update order status with security/business guards
     *
     * @param Order $order
     * @param array $data
     * @param User $actor
     * @param string|null $proofPath
     * @return void
     */
    public function execute(Order $order, array $data, User $actor, ?string $proofPath): void
    {
        $previousStatus = $order->status;
        $previousPaymentStatus = $order->payment_status;
        $previousTrackingNumber = $order->tracking_number;
        $status = $data['status'];
        $trackingNumber = $data['tracking_number'] ?? null;
        $shippingNotes = $data['shipping_notes'] ?? null;

        DB::transaction(function () use ($order, $status, $trackingNumber, $shippingNotes, $proofPath, $previousStatus, $previousPaymentStatus, $previousTrackingNumber, $actor) {
            $lockedOrder = Order::with(['delivery', 'items'])->lockForUpdate()->findOrFail($order->id);

            if (!$this->isAllowedSellerStatusTransition($lockedOrder, $status)) {
                throw new \Exception('This order status change is not allowed from its current state.');
            }

            // GUARD: Prevent shipping unpaid non-COD orders
            if (in_array($status, ['Shipped', 'Ready for Pickup'])) {
                if ($lockedOrder->payment_method !== 'COD' && $lockedOrder->payment_status !== 'paid') {
                    throw new \Exception('Cannot ship unpaid order. Please wait for payment.');
                }
            }

            if ($lockedOrder->shipping_method === 'Delivery'
                && $lockedOrder->delivery?->external_order_id
                && in_array($status, ['Shipped', 'Delivered'], true)) {
                throw new \Exception('Lalamove-managed delivery orders update automatically from courier status.');
            }

            $replacementInProgress = $lockedOrder->replacement_started_at !== null && $lockedOrder->replacement_resolved_at === null;

            if ($status === 'Completed' && $replacementInProgress) {
                throw new \Exception('Replacement orders must be marked as received by the buyer before completion.');
            }

            // Ensure proof is present before any database writes or side effects when the next status requires it.
            if ($this->statusRequiresProofImage($lockedOrder, $status)) {
                $hasExistingProof = filled($lockedOrder->proof_of_delivery);
                $requiresFreshProof = $this->statusRequiresFreshProofImage($lockedOrder, $status);

                if (!$proofPath && (!$hasExistingProof || $requiresFreshProof)) {
                    throw new \Exception($this->proofRequirementMessage($lockedOrder, $status));
                }
            }

            $updateData = ['status' => $status];

            if ($proofPath) {
                $updateData['proof_of_delivery'] = $proofPath;
            }

            // Set timestamps based on status change
            if ($status === 'Accepted') {
                $updateData['accepted_at'] = now();
            } elseif ($status === 'Processing') {
                // BOM Deduction Trigger
                $this->deductSuppliesForOrder($lockedOrder);
            } elseif ($status === 'Completed') {
                if ($lockedOrder->payment_method === 'COD') {
                    $updateData['payment_status'] = 'paid';
                } elseif ($lockedOrder->payment_status !== 'paid') {
                    throw new \Exception('Cannot complete an unpaid order.');
                }
            } elseif ($status === 'Shipped' || $status === 'Ready for Pickup') {
                $updateData['shipped_at'] = now();
            } elseif ($status === 'Delivered') {
                $updateData['delivered_at'] = now();
                // Auto-complete after 1 day if no return
                $updateData['warranty_expires_at'] = now()->addDay();
            }

            // Add tracking number when shipping
            if ($status === 'Shipped' && $trackingNumber) {
                $updateData['tracking_number'] = $trackingNumber;
            }

            // Add shipping notes if provided
            if ($shippingNotes) {
                $updateData['shipping_notes'] = $shippingNotes;
            }

            // Check for rejection/cancellation to restore stock
            if (in_array($status, ['Rejected', 'Cancelled']) && !in_array($lockedOrder->status, ['Rejected', 'Cancelled'])) {
                foreach ($lockedOrder->items as $item) {
                    $product = Product::lockForUpdate()->find($item->product_id);
                    if ($product) {
                        $product->increment('stock', $item->quantity);
                        $product->decrement('sold', $item->quantity); // Revert sold count
                        $product->refresh();
                        // Sync to linked Supply
                        if ($product->track_as_supply && $product->supply) {
                            $product->supply->update(['quantity' => $product->stock]);
                        }
                    }
                }

                // Restore BOM Supplies if it was Processing
                if ($lockedOrder->status === 'Processing') {
                    foreach ($lockedOrder->items as $item) {
                        $product = Product::with('recipes.supply')->find($item->product_id);
                        if ($product && $product->production_method === 'manufactured') {
                            foreach ($product->recipes as $recipe) {
                                if ($recipe->supply) {
                                    $recipe->supply->increment('quantity', $recipe->quantity_required * $item->quantity);
                                }
                            }
                        }
                    }
                }
            }

            if ($status === 'Cancelled') {
                $updateData['cancelled_at'] = now();
                $updateData['cancellation_reason'] = 'seller_cancelled';
            } elseif ($status === 'Rejected') {
                $updateData['cancelled_at'] = now();
                $updateData['cancellation_reason'] = 'seller_rejected';
            }

            $lockedOrder->update($updateData);
            $lockedOrder->refresh();

            $this->recordOrderAuditEvent(
                $lockedOrder,
                $actor,
                eventType: 'order_status_changed',
                severity: in_array($status, ['Rejected', 'Cancelled'], true) ? 'warning' : 'info',
                title: 'Order Status Updated',
                summary: "{$lockedOrder->order_number} moved from {$previousStatus} to {$lockedOrder->status}.",
                status: strtolower((string) $lockedOrder->status),
                details: [
                    'before' => [
                        'status' => $previousStatus,
                        'payment_status' => $previousPaymentStatus,
                        'tracking_number' => $previousTrackingNumber,
                    ],
                    'after' => [
                        'status' => $lockedOrder->status,
                        'payment_status' => $lockedOrder->payment_status,
                        'tracking_number' => $lockedOrder->tracking_number,
                    ],
                    'lines' => array_values(array_filter([
                        $trackingNumber ? "Tracking number: {$trackingNumber}" : null,
                        $shippingNotes ? 'Shipping notes were updated.' : null,
                        $proofPath ? 'Uploaded a new proof image.' : null,
                    ])),
                ],
            );

            if ($status === 'Completed') {
                $this->orderFinanceService->settleCompletedOrder($lockedOrder);
            }

            // Send email notifications based on status change
            $lockedOrder->load(['items', 'user']);
            $buyer = $lockedOrder->user;

            if ($buyer && $buyer->email) {
                if ($status === 'Accepted') {
                    $this->sendMailSilently(
                        $buyer->email,
                        new OrderAccepted($lockedOrder),
                        'order_accepted',
                        ['order_id' => $lockedOrder->id, 'order_number' => $lockedOrder->order_number]
                    );
                } elseif ($status === 'Shipped') {
                    $this->sendMailSilently(
                        $buyer->email,
                        new OrderShipped($lockedOrder),
                        'order_shipped',
                        ['order_id' => $lockedOrder->id, 'order_number' => $lockedOrder->order_number]
                    );
                }
            }
        });
    }

    private function isAllowedSellerStatusTransition(Order $order, string $nextStatus): bool
    {
        return in_array($nextStatus, $this->allowedSellerNextStatuses($order), true);
    }

    private function statusRequiresProofImage(Order $order, string $nextStatus): bool
    {
        return in_array($nextStatus, ['Shipped', 'Ready for Pickup', 'Delivered'], true)
            && !$order->delivery?->external_order_id;
    }

    private function statusRequiresFreshProofImage(Order $order, string $nextStatus): bool
    {
        return $nextStatus === 'Delivered' && $order->shipping_method === 'Delivery';
    }

    private function proofRequirementMessage(Order $order, string $nextStatus): string
    {
        return match ($nextStatus) {
            'Ready for Pickup' => 'A pickup readiness photo is required before the order can be marked as ready for pickup.',
            'Shipped' => 'A shipment proof photo is required before the order can be marked as shipped.',
            'Delivered' => $order->shipping_method === 'Delivery'
                ? 'A final delivery proof photo is required before the order can be marked as delivered.'
                : 'A proof image is required before the order can be marked as delivered.',
            default => 'A proof image is required for this status update.',
        };
    }

    private function allowedSellerNextStatuses(Order $order): array
    {
        if ($order->shipping_method === 'Delivery' && $order->relationLoaded('delivery') && $order->delivery?->external_order_id) {
            return match ($order->status) {
                'Pending' => ['Accepted', 'Rejected'],
                'Refund/Return' => ['Completed'],
                default => [],
            };
        }

        return match ($order->status) {
            'Pending' => ['Accepted', 'Rejected'],
            'Accepted' => ['Processing', 'Rejected'],
            'Processing' => $order->shipping_method === 'Pick Up'
                ? ['Ready for Pickup']
                : ['Shipped'],
            'Shipped' => ['Delivered'],
            'Ready for Pickup' => ['Delivered'],
            'Delivered' => ['Completed'],
            'Refund/Return' => ['Completed'],
            default => [],
        };
    }

    private function deductSuppliesForOrder(Order $order)
    {
        foreach ($order->items as $item) {
            $product = Product::with('recipes.supply')->find($item->product_id);
            if ($product && $product->production_method === 'manufactured') {
                foreach ($product->recipes as $recipe) {
                    $supply = $recipe->supply;
                    if (!$supply) continue;

                    $totalRequired = $recipe->quantity_required * $item->quantity;

                    if ($supply->quantity < $totalRequired) {
                        throw new \Exception("Insufficient supply: {$supply->name}. Needed {$totalRequired} {$supply->unit}, but only {$supply->quantity} available.");
                    }

                    $supply->decrement('quantity', $totalRequired);

                    // Log the deduction
                    SellerActivityLog::create([
                        'user_id' => $order->artisan_id,
                        'action' => 'supply_deducted',
                        'description' => "Deducted {$totalRequired} {$supply->unit} of {$supply->name} for order #{$order->order_number}",
                        'metadata' => [
                            'order_id' => $order->id,
                            'supply_id' => $supply->id,
                            'quantity' => $totalRequired
                        ]
                    ]);
                }
            }
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
