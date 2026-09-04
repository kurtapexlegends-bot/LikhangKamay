<?php

namespace App\Actions\Consumer;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\PayMongoService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class CancelOrder
{
    protected PayMongoService $payMongoService;

    public function __construct(
        ?PayMongoService $payMongoService = null
    ) {
        $this->payMongoService = $payMongoService ?? app(PayMongoService::class);
    }

    /**
     * Cancel order before seller processes it (with 15-minute grace period on accepted orders)
     *
     * @param string $id
     * @param User $buyer
     * @param string $reason
     * @param string|null $details
     * @return void
     */
    public function execute(string $id, User $buyer, string $reason = 'buyer_cancelled', ?string $details = null): void
    {
        DB::transaction(function () use ($id, $buyer, $reason, $details) {
            $order = Order::lockForUpdate()->where('id', $id)
                ->where('user_id', $buyer->id)
                ->with('items')
                ->firstOrFail();

            $isPending = $order->status === 'Pending';
            $isWithinGracePeriod = $order->status === 'Accepted'
                && $order->accepted_at !== null
                && $order->accepted_at->greaterThanOrEqualTo(now()->subMinutes(15));

            if (!$isPending && !$isWithinGracePeriod) {
                throw new \RuntimeException('Orders can only be cancelled while pending or within 15 minutes of acceptance before processing begins.');
            }

            foreach ($order->items as $item) {
                $product = Product::lockForUpdate()->find($item->product_id);
                if ($product) {
                    $product->increment('stock', $item->quantity);
                    $product->refresh();
                    
                    if ($product->track_as_supply && $product->supply) {
                        $product->supply->update(['quantity' => $product->stock]);
                    }

                    $targetDiscountId = $item->discount_id ?: ($product->has_discount && $product->discount_info ? ($product->discount_info['id'] ?? null) : null);
                    if ($targetDiscountId) {
                        $discount = \App\Models\Discount::find($targetDiscountId);
                        $maxLimit = $discount?->max_purchase_limit ?? ($product->discount_info['max_purchase_limit'] ?? null);
                        $promoCount = ($maxLimit !== null && $maxLimit > 0) ? min($item->quantity, $maxLimit) : $item->quantity;
                        if ($promoCount > 0) {
                            \App\Models\Discount::where('id', $targetDiscountId)
                                ->where('promo_sold', '>=', $promoCount)
                                ->decrement('promo_sold', $promoCount);
                        }
                    }
                }
            }

            $updateData = [
                'status' => 'Cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => $details ? "{$reason}: {$details}" : $reason,
            ];

            // Online Payment (PayMongo GCash/Card) Refund Trigger
            if ($order->payment_status === 'paid') {
                $updateData['payment_status'] = 'refunded';

                if (empty($order->payment_id) && !empty($order->paymongo_session_id)) {
                    try {
                        $session = $this->payMongoService->retrieveCheckoutSession($order->paymongo_session_id);
                        $payments = $session['attributes']['payments'] ?? [];
                        if (is_array($payments) && !empty($payments)) {
                            $firstPayment = reset($payments);
                            $resolvedPaymentId = $firstPayment['id'] ?? ($firstPayment['attributes']['id'] ?? null);
                            if ($resolvedPaymentId) {
                                $order->payment_id = $resolvedPaymentId;
                                $updateData['payment_id'] = $resolvedPaymentId;
                            }
                        }
                    } catch (\Throwable $e) {
                        Log::warning("Failed resolving PayMongo payment_id from session {$order->paymongo_session_id}: " . $e->getMessage());
                    }
                }

                if ($order->payment_id) {
                    try {
                        $amountInCents = (int) round(((float) $order->total_amount) * 100);
                        $this->payMongoService->createRefund(
                            paymentId: $order->payment_id,
                            amountInCents: $amountInCents,
                            reason: 'requested_by_customer',
                            notes: "Order {$order->order_number} cancelled by buyer ({$reason})"
                        );
                    } catch (\Throwable $e) {
                        Log::warning("PayMongo automated refund exception for order {$order->id}: " . $e->getMessage());
                    }
                }
            }
            
            $order->update($updateData);

            if ($buyer->email) {
                $reasonDescription = match ($reason) {
                    'change_delivery_address' => 'Need to change delivery address',
                    'modify_order_items' => 'Need to modify items or quantities',
                    'ordered_by_mistake' => 'Order placed by mistake',
                    'found_better_price' => 'Found alternative / better deal',
                    'delivery_time_too_long' => 'Delivery time is too long',
                    default => $details ?: 'Cancelled by customer.',
                };

                \Illuminate\Support\Facades\Mail::to($buyer->email)->send(
                    new \App\Mail\OrderCancelled($order, $reasonDescription)
                );
            }
        });
    }
}

