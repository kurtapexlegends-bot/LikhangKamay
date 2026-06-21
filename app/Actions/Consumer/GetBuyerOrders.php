<?php

namespace App\Actions\Consumer;

use App\Models\Order;
use App\Models\User;
use App\Models\Review;
use App\Services\PayMongoService;
use App\Services\OrderLogisticsService;
use App\Support\OrderWorkflowHelper;
use Illuminate\Support\Collection;

class GetBuyerOrders
{
    private $payMongoService;
    private $orderLogisticsService;

    public function __construct(PayMongoService $payMongoService, OrderLogisticsService $orderLogisticsService)
    {
        $this->payMongoService = $payMongoService;
        $this->orderLogisticsService = $orderLogisticsService;
    }

    /**
     * Get buyer orders with reconciliation and serialization
     *
     * @param User $buyer
     * @return Collection
     */
    public function execute(User $buyer): Collection
    {
        $this->reconcilePendingOnlinePaymentsForUser($buyer);

        $ordersQuery = Order::where('user_id', $buyer->id)
            ->with(['items', 'user', 'artisan:id,name,shop_name', 'delivery', 'dispute'])
            ->latest();

        $initialOrders = (clone $ordersQuery)->get();
        $this->orderLogisticsService->syncVisibleDeliveries($initialOrders->pluck('delivery')->filter());

        $rawOrders = (clone $ordersQuery)->get();
        $reviewsByProduct = $this->getBuyerReviewsByProduct($buyer->id, $rawOrders);

        return $rawOrders->map(function ($order) use ($reviewsByProduct) {
            return $this->serializeOrderForBuyer($order, $reviewsByProduct);
        });
    }

    private function reconcilePendingOnlinePaymentsForUser(User $user): void
    {
        Order::query()
            ->where('user_id', $user->id)
            ->where('payment_method', 'GCash')
            ->where('payment_status', 'pending')
            ->whereNotNull('paymongo_session_id')
            ->whereIn('status', ['Pending', 'Accepted'])
            ->get()
            ->each(function (Order $order) {
                try {
                    $session = $this->payMongoService->retrieveCheckoutSession($order->paymongo_session_id);
                    $attributes = $session['attributes'] ?? [];
                    $referenceNumber = $attributes['reference_number'] ?? null;

                    if ($referenceNumber && $referenceNumber !== $order->order_number) {
                        return;
                    }

                    $isPaid = ($attributes['payment_status'] ?? 'unpaid') === 'paid';
                    $hasPaidPayment = collect($session['included'] ?? [])
                        ->contains(fn (array $included) => ($included['type'] ?? null) === 'payment'
                            && (($included['attributes']['status'] ?? null) === 'paid'));

                    if (!$hasPaidPayment && !empty($attributes['payments']) && is_array($attributes['payments'])) {
                        $hasPaidPayment = collect($attributes['payments'])
                            ->contains(function ($payment) {
                                $paymentStatus = $payment['status'] ?? ($payment['attributes']['status'] ?? null);
                                return $paymentStatus === 'paid';
                            });
                    }

                    if ($isPaid || $hasPaidPayment) {
                        $order->update([
                            'payment_status' => 'paid',
                            'payment_method' => $order->payment_method ?: 'GCash',
                            'paymongo_session_id' => null,
                        ]);
                    }
                } catch (\Throwable $e) {
                    report($e);
                }
            });
    }

    private function getBuyerReviewsByProduct(int $userId, Collection $orders): Collection
    {
        $productIds = $orders
            ->flatMap(fn ($order) => $order->items->pluck('product_id'))
            ->filter()
            ->unique()
            ->values();

        return Review::query()
            ->where('user_id', $userId)
            ->whereIn('product_id', $productIds)
            ->get()
            ->keyBy('product_id');
    }

    private function serializeOrderForBuyer(Order $order, Collection $reviewsByProduct): array
    {
        $canReturn = false;
        if ($order->status === 'Completed' && $order->warranty_expires_at) {
            $canReturn = now()->lessThanOrEqualTo($order->warranty_expires_at);
        }

        $replacementInProgress = $order->replacement_started_at !== null && $order->replacement_resolved_at === null;

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'date' => $order->created_at->format('M d, Y'),
            'total' => number_format($order->total_amount, 2),
            'status' => $order->status,
            'payment_status' => $order->payment_status ?? 'pending',
            'payment_method' => $order->payment_method,
            'shipping_method' => $order->shipping_method,
            'shipping_address' => $order->shipping_address,
            'shipping_address_type' => $order->shipping_address_type,
            'shipping_recipient_name' => $order->shipping_recipient_name,
            'shipping_contact_phone' => $order->shipping_contact_phone,
            'merchandise_subtotal' => number_format((float) $order->merchandise_subtotal, 2),
            'convenience_fee_amount' => number_format((float) $order->convenience_fee_amount, 2),
            'shipping_fee_amount' => number_format($order->getResolvedShippingFeeAmount(), 2),
            'platform_commission_amount' => number_format($order->getResolvedPlatformCommissionAmount(), 2),
            'seller_net_amount' => number_format($order->getResolvedSellerNetAmount(), 2),
            'proof_of_delivery' => $order->proof_of_delivery ? '/storage/' . $order->proof_of_delivery : null,
            'seller_id' => $order->artisan_id,
            'seller_name' => $order->artisan?->shop_name ?? $order->artisan?->name ?? 'Shop',
            'tracking_number' => $order->tracking_number,
            'shipping_notes' => $order->shipping_notes,
            'delivery' => OrderWorkflowHelper::serializeDelivery($order->delivery),
            'cancelled_at' => $order->cancelled_at?->format('M d, Y h:i A'),
            'cancellation_reason' => $order->cancellation_reason,
            'received_at' => $order->received_at?->format('M d, Y h:i A'),
            'warranty_expires_at' => $order->warranty_expires_at?->format('M d, Y h:i A'),
            'dispute' => $order->dispute ? [
                'id' => $order->dispute->id,
                'status' => $order->dispute->status,
                'reason' => $order->dispute->reason,
                'proof_photos' => collect($order->dispute->proof_photos)->map(fn($p) => str_starts_with($p, 'http') ? $p : '/storage/' . $p)->toArray(),
                'seller_response_type' => $order->dispute->seller_response_type,
                'seller_explanation' => $order->dispute->seller_explanation,
                'seller_proposed_description' => $order->dispute->seller_proposed_description,
                'escalation_reason' => $order->dispute->escalation_reason,
                'admin_notes' => $order->dispute->admin_notes,
                'admin_decision' => $order->dispute->admin_decision,
                'resolved_at' => $order->dispute->resolved_at?->format('M d, Y h:i A'),
            ] : null,
            'replacement_resolution_description' => $order->replacement_resolution_description,
            'replacement_started_at' => $order->replacement_started_at?->format('M d, Y h:i A'),
            'replacement_resolved_at' => $order->replacement_resolved_at?->format('M d, Y h:i A'),
            'replacement_in_progress' => $replacementInProgress,
            'created_at_raw' => $order->created_at?->format('M d, Y h:i A'),
            'accepted_at' => $order->accepted_at?->format('M d, Y h:i A'),
            'shipped_at' => $order->shipped_at?->format('M d, Y h:i A'),
            'delivered_at' => $order->delivered_at?->format('M d, Y h:i A'),
            'items' => $order->items->map(function ($item) use ($reviewsByProduct) {
                $existingReview = $reviewsByProduct->get($item->product_id);

                return [
                    'id' => $item->id,
                    'product_id' => $item->product_id,
                    'is_rated' => $existingReview !== null,
                    'name' => $item->product_name,
                    'img' => $item->product_img 
                        ? (str_starts_with($item->product_img, 'http') ? $item->product_img : '/storage/' . $item->product_img)
                        : '/images/placeholder.svg',
                    'price' => $item->price,
                    'qty' => $item->quantity,
                    'variant' => $item->variant ?? 'Standard',
                    'review' => $existingReview ? [
                        'id' => $existingReview->id,
                        'rating' => $existingReview->rating,
                        'comment' => $existingReview->comment,
                        'photos' => collect($existingReview->photos ?? [])
                            ->map(fn ($photo) => str_starts_with($photo, 'http') ? $photo : '/storage/' . $photo)
                            ->values()
                            ->all(),
                        'can_manage_review' => true,
                    ] : null,
                ];
            }),
            'can_return' => $canReturn,
            'can_cancel' => $order->status === 'Pending'
        ];
    }
}
