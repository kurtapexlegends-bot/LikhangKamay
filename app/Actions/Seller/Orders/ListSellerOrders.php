<?php

namespace App\Actions\Seller\Orders;

use App\Models\Order;
use App\Models\User;
use App\Services\OrderLogisticsService;
use App\Services\StorageUrl;
use App\Support\OrderWorkflowHelper;
use Illuminate\Support\Facades\DB;

class ListSellerOrders
{
    private OrderLogisticsService $orderLogisticsService;

    public function __construct(OrderLogisticsService $orderLogisticsService)
    {
        $this->orderLogisticsService = $orderLogisticsService;
    }

    /**
     * Get paginated and filtered seller orders
     *
     * @param int $sellerId
     * @param User|null $seller
     * @param array $filters
     * @return array
     */
    public function execute(int $sellerId, ?User $seller, array $filters): array
    {
        $seller?->loadMissing('addresses');

        $query = Order::where('artisan_id', $sellerId)
            ->with(['items.product.recipes.supply', 'user', 'delivery.events', 'dispute']);

        // 1. Search Filter
        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('tracking_number', 'like', "%{$search}%");
            });
        }

        // Date range filters
        if (!empty($filters['start_date'])) {
            $query->whereDate('created_at', '>=', $filters['start_date']);
        }
        if (!empty($filters['end_date'])) {
            $query->whereDate('created_at', '<=', $filters['end_date']);
        }

        // Fetch tab counts for this artisan (with search and date filters applied, but status omitted)
        $countsQuery = Order::where('artisan_id', $sellerId);

        if (!empty($filters['search'])) {
            $search = $filters['search'];
            $countsQuery->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%")
                    ->orWhere('tracking_number', 'like', "%{$search}%");
            });
        }

        if (!empty($filters['start_date'])) {
            $countsQuery->whereDate('created_at', '>=', $filters['start_date']);
        }
        if (!empty($filters['end_date'])) {
            $countsQuery->whereDate('created_at', '<=', $filters['end_date']);
        }

        $statusCounts = $countsQuery->select(['status', DB::raw('count(*) as count')])
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();

        $tabCounts = [
            'Pending' => $statusCounts['Pending'] ?? 0,
            'Accepted' => $statusCounts['Accepted'] ?? 0,
            'Processing' => $statusCounts['Processing'] ?? 0,
            'Shipped' => $statusCounts['Shipped'] ?? 0,
            'To Pickup' => $statusCounts['Ready for Pickup'] ?? 0,
            'Delivered' => $statusCounts['Delivered'] ?? 0,
            'Returns' => $statusCounts['Refund/Return'] ?? 0,
            'Completed' => $statusCounts['Completed'] ?? 0,
            'Cancelled' => ($statusCounts['Cancelled'] ?? 0) + ($statusCounts['Rejected'] ?? 0),
            'paymentHoldCount' => Order::where('artisan_id', $sellerId)
                ->where('payment_method', '!=', 'COD')
                ->where('payment_status', '!=', 'paid')
                ->where('status', 'Accepted')
                ->count(),
            'hasActiveCourierTracking' => Order::where('artisan_id', $sellerId)
                ->where('shipping_method', 'Delivery')
                ->whereHas('delivery', function ($q) {
                    $q->whereNotNull('external_order_id')
                      ->whereNotIn(DB::raw('UPPER(status)'), ['COMPLETED', 'CANCELED', 'REJECTED', 'EXPIRED']);
                })
                ->exists(),
        ];

        // 2. Status Filter (Tab based)
        if (!empty($filters['status']) && $filters['status'] !== 'All') {
            if ($filters['status'] === 'Cancelled') {
                $query->whereIn('status', ['Cancelled', 'Rejected']);
            } elseif ($filters['status'] === 'To Pickup') {
                $query->where('status', 'Ready for Pickup');
            } elseif ($filters['status'] === 'Returns') {
                $query->where('status', 'Refund/Return');
            } else {
                $query->where('status', $filters['status']);
            }
        }

        // 3. Quick Filter
        if (!empty($filters['quick_filter'])) {
            $qf = $filters['quick_filter'];
            if ($qf === 'urgent') {
                $query->whereIn('status', ['Pending', 'Refund/Return']);
            } elseif ($qf === 'payment_hold') {
                $query->where('payment_method', '!=', 'COD')
                    ->where('payment_status', '!=', 'paid')
                    ->where('status', 'Accepted');
            } elseif ($qf === 'live_courier') {
                $query->where('shipping_method', 'Delivery')
                    ->whereHas('delivery', function ($q) {
                        $q->whereNotNull('external_order_id')
                          ->whereNotIn(DB::raw('UPPER(status)'), ['COMPLETED', 'CANCELED', 'REJECTED', 'EXPIRED']);
                    });
            } elseif ($qf === 'returns') {
                $query->where('status', 'Refund/Return');
            }
        }

        $query->orderBy('created_at', 'desc');

        $paginator = $query->paginate(15)->withQueryString();
        $this->orderLogisticsService->syncVisibleDeliveries($paginator->getCollection()->pluck('delivery')->filter());

        $paginator->through(function ($order) use ($seller) {
            $bookingRequirements = OrderWorkflowHelper::lalamoveBookingRequirements($order, $seller);

            return [
                'id' => $order->order_number,
                'db_id' => $order->id,
                'date' => $order->created_at->format('M d, Y - h:i A'),
                'customer' => $order->customer_name,
                'customer_avatar' => $order->user?->avatar_url,
                'user_id' => $order->user_id,
                'status' => $order->status,
                'payment_status' => $order->payment_status ?? 'pending',
                'payment_method' => $order->payment_method,
                'total' => number_format($order->total_amount, 2),
                'total_amount' => (float) $order->total_amount,
                'merchandise_subtotal' => (float) $order->merchandise_subtotal,
                'convenience_fee_amount' => (float) $order->convenience_fee_amount,
                'shipping_fee_amount' => $order->getResolvedShippingFeeAmount(),
                'platform_commission_amount' => $order->getResolvedPlatformCommissionAmount(),
                'seller_net_amount' => $order->getResolvedSellerNetAmount(),
                'shipping_address' => $order->shipping_address,
                'shipping_address_type' => $order->shipping_address_type,
                'shipping_recipient_name' => $order->shipping_recipient_name,
                'shipping_contact_phone' => $order->shipping_contact_phone,
                'shipping_method' => $order->shipping_method,
                'shipping_notes' => $order->shipping_notes,
                'tracking_number' => $order->tracking_number,
                'proof_of_delivery' => StorageUrl::url($order->proof_of_delivery),
                'cancelled_at' => $order->cancelled_at?->format('M d, Y h:i A'),
                'cancellation_reason' => $order->cancellation_reason,
                'delivery' => OrderWorkflowHelper::serializeDelivery($order->delivery),
                'timeline' => OrderWorkflowHelper::buildOrderTimeline($order),
                'can_book_lalamove' => $order->status === 'Accepted'
                    && $order->shipping_method === 'Delivery'
                    && $order->delivery?->external_order_id === null,
                'lalamove_booking_ready' => empty($bookingRequirements),
                'lalamove_booking_requirements' => $bookingRequirements,
                'return_reason' => $order->return_reason,
                'return_proof_image' => StorageUrl::url($order->return_proof_image),
                'dispute' => $order->dispute ? [
                    'id' => $order->dispute->id,
                    'status' => $order->dispute->status,
                    'reason' => $order->dispute->reason,
                    'proof_photos' => collect($order->dispute->proof_photos ?? [])->map(fn($p) => StorageUrl::url($p))->filter()->values()->toArray(),
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
                'replacement_in_progress' => $order->replacement_started_at !== null && $order->replacement_resolved_at === null,
                'items' => $order->items->map(function ($item) {
                    return [
                        'name' => $item->product_name,
                        'variant' => $item->variant ?? 'Standard',
                        'qty' => $item->quantity,
                        'price' => $item->price,
                        'img' => StorageUrl::url($item->product_img, '/images/placeholder.svg'),
                        'production_method' => $item->product?->production_method,
                        'recipes' => $item->product?->recipes->map(fn($r) => [
                            'supply_id' => $r->supply_id,
                            'supply_name' => $r->supply?->name,
                            'supply_unit' => $r->supply?->unit,
                            'supply_quantity' => $r->supply?->quantity,
                            'quantity_required' => $r->quantity_required,
                        ]),
                    ];
                }),
            ];
        });

        return [
            'orders' => $paginator,
            'tabCounts' => $tabCounts
        ];
    }
}
