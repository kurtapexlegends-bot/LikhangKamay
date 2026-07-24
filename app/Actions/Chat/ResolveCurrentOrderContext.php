<?php

namespace App\Actions\Chat;

use App\Models\Order;
use App\Models\User;
use App\Services\StorageUrl;

class ResolveCurrentOrderContext
{
    public function execute(?User $actor, ?User $counterpart, bool $sellerPerspective): ?array
    {
        if (!$actor || !$counterpart || $counterpart->isAdmin() || $counterpart->isStaff()) {
            return null;
        }

        $orderQuery = Order::query()
            ->with('items')
            ->whereNotIn('status', $this->terminalOrderStatuses());

        if ($sellerPerspective) {
            $sellerOwner = $actor->getEffectiveSeller();
            $sellerOwnerId = $sellerOwner ? $sellerOwner->id : $actor->id;

            $orderQuery
                ->where('artisan_id', $sellerOwnerId)
                ->where('user_id', $counterpart->id);
        } else {
            $orderQuery
                ->where('user_id', $actor->id)
                ->where('artisan_id', $counterpart->id);
        }

        $orders = $orderQuery->get()->sortBy(function($o) {
            return ($o->status === 'Pending' ? 0 : 1) . '_' . (9999999999 - ($o->created_at?->timestamp ?? 0));
        })->values();

        $mappedOrders = $orders->map(function ($order) use ($sellerPerspective, $actor) {
            $canRespond = $sellerPerspective
                && $order->status === 'Pending'
                && $actor->canAccessSellerModule('orders');

            $lineItemsCount = $order->items->count();
            $unitsCount = (int) $order->items->sum('quantity');

            return [
                'orderNumber' => $order->order_number,
                'dbId' => $order->id,
                'status' => $order->status,
                'paymentStatus' => $order->payment_status ?? 'pending',
                'customerName' => $order->customer_name,
                'placedAt' => $order->created_at?->format('M d, Y h:i A'),
                'shippingAddress' => $order->shipping_address,
                'shippingMethod' => $order->shipping_method,
                'shippingNotes' => $order->shipping_notes,
                'paymentMethod' => $order->payment_method,
                'trackingNumber' => $order->tracking_number,
                'totalAmount' => (float) $order->total_amount,
                'formattedTotal' => number_format((float) $order->total_amount, 2),
                'canRespond' => $canRespond,
                'isReadOnly' => !$canRespond,
                'detailsRoute' => $sellerPerspective ? route('orders.index') : route('my-orders.index'),
                'lineItemsCount' => $lineItemsCount,
                'itemsCount' => $lineItemsCount,
                'unitsCount' => $unitsCount,
                'items' => $order->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'name' => $item->product_name,
                        'variant' => $item->variant ?: 'Standard',
                        'quantity' => $item->quantity,
                        'price' => (float) $item->price,
                        'img' => $this->resolveProductImagePath($item->product_img),
                    ];
                })->values()->all(),
            ];
        })->values()->all();

        if (empty($mappedOrders)) {
            return null;
        }

        $primaryOrder = $mappedOrders[0];
        $activeOrdersCount = count($mappedOrders);
        $hasPending = $orders->contains(fn($o) => $o->status === 'Pending');

        return [
            ...$primaryOrder,
            'activeOrdersCount' => $activeOrdersCount,
            'otherActiveOrdersCount' => max(0, $activeOrdersCount - 1),
            'selectionSummary' => $activeOrdersCount > 1
                ? ($hasPending
                    ? 'Showing the pending order first. View Orders to review the other active orders in this conversation.'
                    : 'Showing the latest active order. View Orders to review the rest of this conversation\'s open orders.')
                : null,
            'activeOrders' => $mappedOrders,
        ];
    }

    /**
     * @return array<int, string>
     */
    private function terminalOrderStatuses(): array
    {
        return ['Completed', 'Cancelled', 'Rejected', 'Refunded', 'Replaced'];
    }

    private function resolveProductImagePath(?string $path): string
    {
        return StorageUrl::url($path, '/images/placeholder.svg');
    }
}
