<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Product;
use App\Models\OrderDelivery;
use App\Models\OrderDeliveryEvent;
use App\Models\Order;
use App\Models\Review;
use App\Models\SellerActivityLog;
use App\Models\User;
use App\Services\SponsorshipAnalyticsService;
use App\Services\OrderFinanceService;
use App\Services\OrderLogisticsService;
use App\Services\CheckoutShippingService;
use App\Services\PayMongoService;
use App\Mail\OrderPlaced;
use App\Mail\OrderAccepted;
use App\Mail\OrderShipped;
use App\Mail\OrderDelivered;
use App\Mail\ReturnRequested;
use App\Mail\RefundProcessed;
use App\Notifications\ReplacementResolutionNotification;
use App\Support\StructuredAddress;
use Illuminate\Http\Request;
use Illuminate\Mail\Mailable;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;


class OrderController extends Controller
{
    use InteractsWithSellerContext;

    /**
     * SELLER: View all orders for the logged-in artisan
     */
    public function index(OrderLogisticsService $orderLogisticsService)
    {
        $sellerId = $this->sellerOwnerId();
        $seller = $this->sellerOwner();
        $seller?->loadMissing('addresses');

        $ordersQuery = Order::where('artisan_id', $sellerId)
            ->with(['items', 'user', 'delivery.events']) // Load items, buyer info, and courier events
            ->orderBy('created_at', 'desc');

        $initialOrders = (clone $ordersQuery)->get();
        $orderLogisticsService->syncVisibleDeliveries($initialOrders->pluck('delivery')->filter());

        $orders = (clone $ordersQuery)->get()
            ->map(function ($order) use ($seller) {
                $bookingRequirements = $this->lalamoveBookingRequirements($order, $seller);

                return [
                    'id' => $order->order_number,
                    'db_id' => $order->id,
                    'date' => $order->created_at->format('M d, Y - h:i A'),
                    'customer' => $order->customer_name,
                    'user_id' => $order->user_id, // For chat linking
                    'status' => $order->status,
                    'payment_status' => $order->payment_status ?? 'pending',
                    'payment_method' => $order->payment_method,
                    'total' => number_format($order->total_amount, 2),
                    'merchandise_subtotal' => (float) $order->merchandise_subtotal,
                    'convenience_fee_amount' => (float) $order->convenience_fee_amount,
                    'shipping_fee_amount' => $order->getResolvedShippingFeeAmount(),
                    'platform_commission_amount' => $order->getResolvedPlatformCommissionAmount(),
                    'seller_net_amount' => $order->getResolvedSellerNetAmount(),
                    'shipping_address' => $order->shipping_address,
                    'shipping_address_type' => $order->shipping_address_type,
                    'shipping_recipient_name' => $order->shipping_recipient_name,
                    'shipping_contact_phone' => $order->shipping_contact_phone,
                    'shipping_method' => $order->shipping_method, // New
                    'shipping_notes' => $order->shipping_notes,
                    'tracking_number' => $order->tracking_number,
                    'proof_of_delivery' => $order->proof_of_delivery ? '/storage/' . $order->proof_of_delivery : null, // New
                    'cancelled_at' => $order->cancelled_at?->format('M d, Y h:i A'),
                    'cancellation_reason' => $order->cancellation_reason,
                    'delivery' => $this->serializeDelivery($order->delivery),
                    'timeline' => $this->buildOrderTimeline($order),
                    'can_book_lalamove' => $order->status === 'Accepted'
                        && $order->shipping_method === 'Delivery'
                        && $order->delivery?->external_order_id === null,
                    'lalamove_booking_ready' => empty($bookingRequirements),
                    'lalamove_booking_requirements' => $bookingRequirements,
                    'return_reason' => $order->return_reason,
                    'return_proof_image' => $order->return_proof_image ? '/storage/' . $order->return_proof_image : null,
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
                            'img' => str_starts_with($item->product_img, 'http') ? $item->product_img : ($item->product_img ? '/storage/' . $item->product_img : '/images/placeholder.svg')
                        ];
                    }),
                ];
            });

        return Inertia::render('Seller/OrderManager', [
            'orders' => $orders
        ]);
    }

    /**
     * SELLER: Export orders to CSV
     */
    public function export()
    {
        $orders = Order::where('artisan_id', $this->sellerOwnerId())
            ->with(['items', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();

        $filename = "orders_" . date('Y-m-d_H-i-s') . ".csv";

        $headers = [
            "Content-Type" => "text/csv",
            "Content-Disposition" => "attachment; filename=\"$filename\"",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        $callback = function () use ($orders) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['Order ID', 'Date', 'Customer', 'Status', 'Total', 'Payment Method', 'Payment Status', 'Shipping Method', 'Tracking Number']);

            foreach ($orders as $order) {
                fputcsv($file, [
                    $order->order_number,
                    $order->created_at->format('Y-m-d H:i:s'),
                    $order->customer_name,
                    $order->status,
                    $order->total_amount,
                    $order->payment_method,
                    $order->payment_status,
                    $order->shipping_method,
                    $order->tracking_number
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    /**
     * BUYER: Checkout page - prepare order
     */
    public function create(Request $request)
    {
        $items = [];

        // CASE 1: Buy Now (Single Product)
        if ($request->has('product_id')) {
            $product = Product::with('user')->find($request->product_id);
            $variant = trim((string) $request->input('variant', 'Standard')) ?: 'Standard';

            if ($product) {
                $items[] = [
                    'id' => $product->id,
                    'cart_key' => null,
                    'artisan_id' => $product->artisan_id ?? $product->user_id,
                    'shop_name' => $product->user->shop_name ?? 'Shop',
                    'name' => $product->name,
                    'variant' => $variant,
                    'price' => $product->price,
                    'qty' => $request->input('quantity', 1), // Accept quantity from request
                    'img' => $product->img // Already a full URL from the model accessor
                ];
            }
        }
        // CASE 2: Checkout from Cart
        else {
            $cart = Session::get('cart', []);
            $selectedIds = collect($request->input('items', []))
                ->map(fn ($item) => (string) $item)
                ->values()
                ->all();

            if (!empty($selectedIds) && is_array($selectedIds)) {
                // Filter cart to only selected items
                $items = array_filter(
                    $cart,
                    function ($item, $cartKey) use ($selectedIds) {
                        return in_array((string) $cartKey, $selectedIds, true)
                            || in_array((string) ($item['id'] ?? ''), $selectedIds, true);
                    },
                    ARRAY_FILTER_USE_BOTH
                );
            } else {
                // Default: All items
                $items = $cart;
            }

            $items = array_values(array_map(function ($item, $cartKey) {
                if (!isset($item['cart_key'])) {
                    $item['cart_key'] = (string) $cartKey;
                }

                if (!isset($item['variant']) || trim((string) $item['variant']) === '') {
                    $item['variant'] = 'Standard';
                }

                return $item;
            }, $items, array_keys($items)));

            // Ensure images have full path if they came from cart (checks if they already have full path)
            foreach ($items as &$item) {
                if ($item['img'] && !str_starts_with($item['img'], 'http') && !str_starts_with($item['img'], '/storage/')) {
                    $item['img'] = '/storage/' . $item['img'];
                }
            }
        }

        if (empty($items)) {
            return redirect()->route('cart.index')->with('error', 'Your cart is empty.');
        }

        return Inertia::render('Shop/Checkout', [
            'items' => $items,
            'pricing' => [
                'convenience_fee_rate' => OrderFinanceService::CONVENIENCE_FEE_RATE,
            ],
            'auth' => [
                'user' => Auth::user()->load('addresses'),
            ]
        ]);
    }

    public function quoteShipping(Request $request, CheckoutShippingService $checkoutShippingService)
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
            'shipping_method' => 'required|string|in:Delivery,Pick Up',
            'selected_address_id' => 'nullable',
            'shipping_address' => 'nullable|string',
            'shipping_address_type' => 'nullable|string|in:home,office,other',
            'shipping_street_address' => 'nullable|string|max:255',
            'shipping_barangay' => 'nullable|string|max:255',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_region' => 'nullable|string|max:255',
            'shipping_postal_code' => 'nullable|string|max:20',
        ]);

        /** @var User $buyer */
        $buyer = $request->user();

        if ($request->shipping_method === 'Pick Up') {
            return response()->json([
                'total_shipping_fee' => 0,
                'groups' => [],
                'source' => 'pickup',
            ]);
        }

        $shippingContext = $this->resolveCheckoutDeliveryContext($request, $buyer, false);
        $groupedItems = $this->groupCheckoutItemsBySeller($request->input('items', []));

        $groups = [];
        $totalShippingFee = 0.0;

        foreach ($groupedItems as $artisanId => $items) {
            $seller = User::find($artisanId);

            if (!$seller) {
                continue;
            }

            $quote = $checkoutShippingService->estimateForSeller($seller, [
                ...$shippingContext,
                'shipping_method' => $request->shipping_method,
            ]);

            $shippingFee = round((float) ($quote['amount'] ?? 0), 2);
            $totalShippingFee += $shippingFee;

            $groups[] = [
                'seller_id' => (int) $artisanId,
                'shipping_fee_amount' => $shippingFee,
                'currency' => $quote['currency'] ?? 'PHP',
                'source' => $quote['source'] ?? 'fallback_flat',
            ];
        }

        return response()->json([
            'total_shipping_fee' => round($totalShippingFee, 2),
            'groups' => $groups,
            'source' => collect($groups)->contains(fn (array $group) => ($group['source'] ?? '') === 'lalamove_quote')
                ? 'mixed'
                : 'fallback',
        ]);
    }

    /**
     * SELLER: Update order status (Accept, Ship, Deliver, Reject, etc.)
     */
    public function update(Request $request, $id, OrderFinanceService $orderFinanceService)
    {
        $order = Order::where('order_number', $id)
            ->where('artisan_id', $this->sellerOwnerId())
            ->with('delivery')
            ->firstOrFail();
        $previousStatus = $order->status;
        $previousPaymentStatus = $order->payment_status;
        $previousTrackingNumber = $order->tracking_number;

        $request->validate([
            'status' => 'required|string|in:Accepted,Rejected,Shipped,Ready for Pickup,Delivered,Completed,Cancelled',
            'tracking_number' => 'nullable|string|max:100',
            'shipping_notes' => 'nullable|string|max:500',
            'proof_of_delivery' => 'nullable|image|max:5120' // 5MB Max
        ]);

        if (!$this->isAllowedSellerStatusTransition($order, $request->status)) {
            return back()->with('error', 'This order status change is not allowed from its current state.');
        }

        // GUARD: Prevent shipping unpaid non-COD orders
        if (in_array($request->status, ['Shipped', 'Ready for Pickup'])) {
            if ($order->payment_method !== 'COD' && $order->payment_status !== 'paid') {
                return back()->with('error', 'Cannot ship unpaid order. Please wait for payment.');
            }
        }

        if ($order->shipping_method === 'Delivery'
            && $order->delivery?->external_order_id
            && in_array($request->status, ['Shipped', 'Delivered'], true)) {
            return back()->with('error', 'Lalamove-managed delivery orders update automatically from courier status.');
        }

        $replacementInProgress = $order->replacement_started_at !== null && $order->replacement_resolved_at === null;

        if ($request->status === 'Completed' && $replacementInProgress) {
            return back()->with('error', 'Replacement orders must be marked as received by the buyer before completion.');
        }

        $updateData = ['status' => $request->status];

        // Ensure proof is present before any database writes or side effects when the next status requires it.
        if ($this->statusRequiresProofImage($order, $request->status)) {
            $hasExistingProof = filled($order->proof_of_delivery);
            $requiresFreshProof = $this->statusRequiresFreshProofImage($order, $request->status);

            if (
                !$request->hasFile('proof_of_delivery')
                && (!$hasExistingProof || $requiresFreshProof)
            ) {
                return back()->with('error', $this->proofRequirementMessage($order, $request->status));
            }
        }

        // Handle Proof of Delivery Upload
        if ($request->hasFile('proof_of_delivery')) {
            $path = $request->file('proof_of_delivery')->store('proofs', 'public');
            $updateData['proof_of_delivery'] = $path;
        }

        // Set timestamps based on status change
        if ($request->status === 'Accepted') {
            $updateData['accepted_at'] = now();
        } elseif ($request->status === 'Completed') {
            if ($order->payment_method === 'COD') {
                $updateData['payment_status'] = 'paid';
            } elseif ($order->payment_status !== 'paid') {
                return back()->with('error', 'Cannot complete an unpaid order.');
            }
        } elseif ($request->status === 'Shipped' || $request->status === 'Ready for Pickup') {
            $updateData['shipped_at'] = now();
        } elseif ($request->status === 'Delivered') {
            $updateData['delivered_at'] = now();
            // Auto-complete after 1 day if no return
            $updateData['warranty_expires_at'] = now()->addDay();
        }

        // Add tracking number when shipping
        if ($request->status === 'Shipped' && $request->tracking_number) {
            $updateData['tracking_number'] = $request->tracking_number;
        }

        // Add shipping notes if provided
        if ($request->shipping_notes) {
            $updateData['shipping_notes'] = $request->shipping_notes;
        }

        // Check for rejection/cancellation to restore stock
        if (in_array($request->status, ['Rejected', 'Cancelled']) && !in_array($order->status, ['Rejected', 'Cancelled'])) {
            DB::transaction(function () use ($order, $updateData) {
                foreach ($order->items as $item) {
                    $product = Product::find($item->product_id);
                    if ($product) {
                        $product->increment('stock', $item->quantity);
                        $product->decrement('sold', $item->quantity); // Revert sold count
                        // Sync to linked Supply
                        if ($product->track_as_supply && $product->supply) {
                            $product->supply->update(['quantity' => $product->stock]);
                        }
                    }
                }
            });
        }

        if ($request->status === 'Cancelled') {
            $updateData['cancelled_at'] = now();
            $updateData['cancellation_reason'] = 'seller_cancelled';
        } elseif ($request->status === 'Rejected') {
            $updateData['cancelled_at'] = now();
            $updateData['cancellation_reason'] = 'seller_rejected';
        }

        $order->update($updateData);
        $order->refresh();

        $this->recordOrderAuditEvent(
            $order,
            $request->user(),
            eventType: 'order_status_changed',
            severity: in_array($request->status, ['Rejected', 'Cancelled'], true) ? 'warning' : 'info',
            title: 'Order Status Updated',
            summary: "{$order->order_number} moved from {$previousStatus} to {$order->status}.",
            status: strtolower((string) $order->status),
            details: [
                'before' => [
                    'status' => $previousStatus,
                    'payment_status' => $previousPaymentStatus,
                    'tracking_number' => $previousTrackingNumber,
                ],
                'after' => [
                    'status' => $order->status,
                    'payment_status' => $order->payment_status,
                    'tracking_number' => $order->tracking_number,
                ],
                'lines' => array_values(array_filter([
                    $request->tracking_number ? "Tracking number: {$request->tracking_number}" : null,
                    $request->shipping_notes ? 'Shipping notes were updated.' : null,
                    $request->hasFile('proof_of_delivery') ? 'Uploaded a new proof image.' : null,
                ])),
            ],
        );

        if ($request->status === 'Completed') {
            $orderFinanceService->settleCompletedOrder($order);
        }

        // Send email notifications based on status change
        $order->load(['items', 'user']);
        $buyer = $order->user;

        if ($buyer && $buyer->email) {
            if ($request->status === 'Accepted') {
                $this->sendMailSilently(
                    $buyer->email,
                    new OrderAccepted($order),
                    'order_accepted',
                    ['order_id' => $order->id, 'order_number' => $order->order_number]
                );
            } elseif ($request->status === 'Shipped') {
                $this->sendMailSilently(
                    $buyer->email,
                    new OrderShipped($order),
                    'order_shipped',
                    ['order_id' => $order->id, 'order_number' => $order->order_number]
                );
            }
        }

        return redirect()->back();
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

    /**
     * @return array<int, string>
     */
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
            'Accepted' => $order->shipping_method === 'Pick Up'
                ? ['Ready for Pickup']
                : ['Shipped'],
            'Shipped' => ['Delivered'],
            'Ready for Pickup' => ['Delivered'],
            'Delivered' => ['Completed'],
            'Refund/Return' => ['Completed'],
            default => [],
        };
    }

    /**
     * SELLER: Approve return request
     */
    public function approveReturn(Request $request, $id, OrderFinanceService $orderFinanceService, OrderLogisticsService $orderLogisticsService)
    {
        $order = Order::where('order_number', $id)
            ->where('artisan_id', $this->sellerOwnerId())
            ->where('status', 'Refund/Return')
            ->firstOrFail();

        $request->validate([
            'action_type' => 'required|in:refund,replace',
            'replacement_resolution_description' => 'required_if:action_type,replace|string|max:2000',
        ]);

        if ($request->action_type === 'refund') {
            try {
                DB::transaction(function () use ($order, $orderFinanceService) {
                    $lockedOrder = Order::query()
                        ->with('user')
                        ->lockForUpdate()
                        ->findOrFail($order->id);

                    if ($lockedOrder->status !== 'Refund/Return') {
                        throw new \RuntimeException('This return request is no longer pending.');
                    }

                    $lockedOrder->update([
                        'status' => 'Refunded',
                        'payment_status' => 'refunded',
                    ]);

                });
            } catch (\Throwable $e) {
                report($e);

                $message = $e->getMessage() === 'This return request is no longer pending.'
                    ? $e->getMessage()
                    : 'Refund could not be completed right now.';

                return back()->with('error', $message);
            }

            $order = $order->fresh(['user']);

            $this->recordOrderAuditEvent(
                $order,
                $request->user(),
                eventType: 'return_refunded',
                severity: 'warning',
                title: 'Return Refunded',
                summary: "{$order->order_number} was approved for refund.",
                status: 'refunded',
                details: [
                    'before' => [
                        'status' => 'Refund/Return',
                    ],
                    'after' => [
                        'status' => $order->status,
                        'payment_status' => $order->payment_status,
                    ],
                    'lines' => ['Seller approved the buyer return request for refund.'],
                ],
            );

            try {
                // Send refund email to buyer
                $buyer = $order?->user;
                if ($buyer && $buyer->email) {
                    $this->sendMailSilently(
                        $buyer->email,
                        new RefundProcessed($order),
                        'refund_processed',
                        ['order_id' => $order->id, 'order_number' => $order->order_number]
                    );
                }
            } catch (\Throwable $e) {
                report($e);
            }

            return back()->with('success', 'Return approved and marked as refunded.');
        } else {
            $resolutionDescription = trim((string) $request->replacement_resolution_description);
            $shouldAutoBookReplacement = false;

            try {
                DB::transaction(function () use ($order, $resolutionDescription, &$shouldAutoBookReplacement) {
                    $lockedOrder = Order::query()
                        ->with(['items', 'user', 'delivery'])
                        ->lockForUpdate()
                        ->findOrFail($order->id);

                    $buyer = $lockedOrder->user;

                    if ($lockedOrder->status !== 'Refund/Return') {
                        throw new \Exception('This return request is no longer pending.');
                    }

                    foreach ($lockedOrder->items as $item) {
                        $product = Product::lockForUpdate()->find($item->product_id);
                        
                        if (!$product || $product->stock < $item->quantity) {
                            throw new \Exception("Insufficient stock to replace " . ($product ? $product->name : 'Unknown Product') . ". Requires {$item->quantity} but only " . ($product ? $product->stock : 0) . " left.");
                        }
                        
                        $product->decrement('stock', $item->quantity);
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
                    $order = $order->fresh(['delivery', 'user']);

                    try {
                        $orderLogisticsService->bookLalamoveDelivery($order, $this->sellerOwner());
                        $message = 'Replacement approved. Buyer notified and the replacement exchange courier was booked.';
                    } catch (\Throwable $e) {
                        report($e);
                        $message = 'Replacement approved. Buyer notified. Courier rebooking could not be created automatically. Use Create Lalamove Delivery to retry.';
                    }
                }

                $order = $order->fresh(['user']);
                $this->recordOrderAuditEvent(
                    $order,
                    $request->user(),
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

                return back()->with('success', $message);
            } catch (\Exception $e) {
                return back()->with('error', $e->getMessage());
            }
        }
    }

    /**
     * SELLER: Update payment status (mark as paid/refunded)
     */
    public function updatePaymentStatus(Request $request, $id)
    {
        $order = Order::where('order_number', $id)
            ->where('artisan_id', $this->sellerOwnerId())
            ->firstOrFail();

        $request->validate([
            'payment_status' => 'required|string|in:paid'
        ]);

        if ($order->payment_method !== 'COD') {
            return redirect()->back()->with('error', 'Only cash on delivery orders can be marked paid manually.');
        }

        if (in_array($order->status, ['Refunded', 'Cancelled', 'Rejected'], true)) {
            return redirect()->back()->with('error', 'Payment status can no longer be changed for this order.');
        }

        if ($order->payment_status === 'paid') {
            return redirect()->back()->with('success', 'Payment status is already up to date.');
        }

        $order->update(['payment_status' => $request->payment_status]);

        $this->recordOrderAuditEvent(
            $order->fresh(),
            $request->user(),
            eventType: 'payment_status_updated',
            severity: 'info',
            title: 'Order Payment Updated',
            summary: "{$order->order_number} was manually marked as paid.",
            status: strtolower((string) $request->payment_status),
            details: [
                'before' => [
                    'payment_status' => $order->getOriginal('payment_status'),
                ],
                'after' => [
                    'payment_status' => $request->payment_status,
                ],
                'lines' => ['Manual COD payment confirmation was applied.'],
            ],
        );

        return redirect()->back()->with('success', 'Payment status updated.');
    }

    /**
     * BUYER: Place a new order
     */
    public function store(
        Request $request,
        SponsorshipAnalyticsService $sponsorshipAnalytics,
        OrderFinanceService $orderFinanceService,
        CheckoutShippingService $checkoutShippingService
    )
    {
        $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.variant' => 'nullable|string|max:255',
            'shipping_method' => 'required|string|in:Delivery,Pick Up',
            'selected_address_id' => 'nullable',
            'shipping_address' => 'nullable|string',
            'shipping_address_type' => 'nullable|string|in:home,office,other',
            'shipping_street_address' => 'nullable|string|max:255',
            'shipping_barangay' => 'nullable|string|max:255',
            'shipping_city' => 'nullable|string|max:255',
            'shipping_region' => 'nullable|string|max:255',
            'shipping_postal_code' => 'nullable|string|max:20',
            'recipient_name' => 'nullable|string|max:100',
            'phone_number' => 'nullable|string|max:20',
            'payment_method' => 'required|string|in:COD,GCash',
            'total' => 'required|numeric',
            'shipping_notes' => 'nullable|string',
            'save_address' => 'nullable|boolean',
        ]);

        /** @var User $buyer */
        $buyer = $request->user();
        $shippingContext = $request->shipping_method === 'Delivery'
            ? $this->resolveCheckoutDeliveryContext($request, $buyer, true)
            : [
                'selected_address' => null,
                'shipping_address' => 'Store Pick-up - Negotiate via Chat',
                'shipping_address_type' => null,
                'shipping_recipient_name' => null,
                'shipping_contact_phone' => null,
                'shipping_street_address' => null,
                'shipping_barangay' => null,
                'shipping_city' => null,
                'shipping_region' => null,
                'shipping_postal_code' => null,
            ];

        $selectedAddress = $shippingContext['selected_address'];
        $shippingAddress = $shippingContext['shipping_address'];
        $shippingAddressType = $shippingContext['shipping_address_type'];
        $shippingRecipientName = $shippingContext['shipping_recipient_name'];
        $shippingContactPhone = $shippingContext['shipping_contact_phone'];
        $shippingStreetAddress = $shippingContext['shipping_street_address'];
        $shippingBarangay = $shippingContext['shipping_barangay'];
        $shippingCity = $shippingContext['shipping_city'];
        $shippingRegion = $shippingContext['shipping_region'];
        $shippingPostalCode = $shippingContext['shipping_postal_code'];

        // Force COD for Pick Up
        $paymentMethod = $request->shipping_method === 'Pick Up' ? 'COD' : $request->payment_method;

        // Save address if requested (Only for Delivery + New Address)
        if ($request->boolean('save_address') && $request->shipping_method === 'Delivery' && $selectedAddress === null) {
            $buyer->addresses()->update(['is_default' => false]);

            $buyer->addresses()->create([
                'label' => ucfirst((string) $shippingAddressType),
                'address_type' => $shippingAddressType,
                'recipient_name' => $shippingRecipientName,
                'phone_number' => $shippingContactPhone,
                'street_address' => $shippingStreetAddress,
                'barangay' => $shippingBarangay,
                'full_address' => $shippingAddress,
                'city' => $shippingCity,
                'region' => $shippingRegion,
                'postal_code' => $shippingPostalCode,
                'is_default' => true,
            ]);

            $buyer->update(['saved_address' => $shippingAddress]);
        } elseif ($selectedAddress !== null) {
            $buyer->update(['saved_address' => $selectedAddress->full_address]);
        }

        // Resolve each item from the database before grouping so seller ownership
        // cannot be reassigned by a tampered checkout payload.
        $supportsWasSponsored = Schema::hasColumn('order_items', 'was_sponsored');
        $supportsSponsorshipRequestId = Schema::hasColumn('order_items', 'sponsorship_request_id');
        $supportsSponsoredAtCheckout = Schema::hasColumn('order_items', 'sponsored_at_checkout');

        $groupedItems = $this->groupCheckoutItemsBySeller($request->items);

        $financeBySeller = [];
        $grandTotal = 0.0;

        foreach ($groupedItems as $artisanId => $items) {
            $merchandiseSubtotal = 0;

            foreach ($items as $item) {
                $product = Product::find($item['id']);
                if ($product) {
                    $merchandiseSubtotal += $product->price * $item['qty'];
                }
            }

            $seller = User::find((int) $artisanId);
            $shippingFee = 0.0;

            if ($request->shipping_method === 'Delivery' && $seller) {
                $shippingQuote = $checkoutShippingService->estimateForSeller($seller, [
                    'shipping_method' => $request->shipping_method,
                    'shipping_address' => $shippingAddress,
                    'shipping_street_address' => $shippingStreetAddress,
                    'shipping_barangay' => $shippingBarangay,
                    'shipping_city' => $shippingCity,
                    'shipping_region' => $shippingRegion,
                    'shipping_postal_code' => $shippingPostalCode,
                ]);

                $shippingFee = (float) ($shippingQuote['amount'] ?? 0);
            }

            $financeBySeller[(string) $artisanId] = $orderFinanceService->calculateAmounts(
                $merchandiseSubtotal,
                $request->shipping_method,
                $shippingFee
            );
            $grandTotal += $financeBySeller[(string) $artisanId]['total_amount'];
        }

        // Wrap in transaction to ensure stock is deducted only if order succeeds
        DB::transaction(function () use (
            $request,
            $buyer,
            $groupedItems,
            $shippingAddress,
            $shippingAddressType,
            $shippingRecipientName,
            $shippingContactPhone,
            $shippingStreetAddress,
            $shippingBarangay,
            $shippingCity,
            $shippingRegion,
            $shippingPostalCode,
            $paymentMethod,
            $financeBySeller,
            $sponsorshipAnalytics,
            $supportsWasSponsored,
            $supportsSponsorshipRequestId,
            $supportsSponsoredAtCheckout
        ) {
            foreach ($groupedItems as $artisanId => $items) {
                $finance = $financeBySeller[(string) $artisanId];
                $paymentStatus = 'pending';
                
                $order = Order::create(Order::filterSchemaCompatibleAttributes([
                    'order_number' => 'ORD-' . strtoupper(uniqid()),
                    'user_id' => Auth::id(),
                    'artisan_id' => $artisanId,
                    'customer_name' => Auth::user()->name,
                    'merchandise_subtotal' => $finance['merchandise_subtotal'],
                    'convenience_fee_amount' => $finance['convenience_fee_amount'],
                    'shipping_fee_amount' => $finance['shipping_fee_amount'],
                    'platform_commission_amount' => $finance['platform_commission_amount'],
                    'seller_net_amount' => $finance['seller_net_amount'],
                    'total_amount' => $finance['total_amount'],
                    'status' => 'Pending',
                    'shipping_address' => $shippingAddress,
                    'shipping_address_type' => $shippingAddressType,
                    'shipping_street_address' => $shippingStreetAddress,
                    'shipping_barangay' => $shippingBarangay,
                    'shipping_city' => $shippingCity,
                    'shipping_region' => $shippingRegion,
                    'shipping_postal_code' => $shippingPostalCode,
                    'shipping_recipient_name' => $shippingRecipientName,
                    'shipping_contact_phone' => $shippingContactPhone,
                    'shipping_notes' => $request->shipping_notes,
                    'payment_method' => $paymentMethod,
                    'payment_status' => $paymentStatus,
                    'shipping_method' => $request->shipping_method,
                ]));

                foreach ($items as $item) {
                    // CRITICAL: Stock Deduction & Validation
                    $product = Product::lockForUpdate()->find($item['id']);
                    
                    if (!$product || $product->stock < $item['qty']) {
                        throw new \Exception("Insufficient stock for product: " . ($product ? $product->name : $item['name']));
                    }

                    $product->decrement('stock', $item['qty']);
                    $product->increment('sold', $item['qty']); // Increment sold count

                    // Sync to linked Supply (Track as Supply)
                    if ($product->track_as_supply && $product->supply) {
                        $product->supply->update(['quantity' => $product->stock]);
                    }

                    // Check for Low Stock
                    if ($product->stock <= 5) {
                        $seller = User::find($product->user_id); // Assuming product belongs to user
                        if ($seller) {
                            $seller->notify(new \App\Notifications\LowStockNotification($product));
                        }
                    }

                    // Ensure we save the actual DB snapshot of the product at checkout time
                    $orderItemData = [
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'variant' => $item['variant'] ?? null,
                        'price' => $product->price, // Secure DB price
                        'cost' => $product->cost_price ?? 0,
                        'quantity' => $item['qty'],
                        'product_img' => $product->cover_photo_path, // Use the actual DB path
                    ];

                    if ($supportsWasSponsored || $supportsSponsorshipRequestId || $supportsSponsoredAtCheckout) {
                        $activeSponsorshipRequest = $sponsorshipAnalytics->resolveActiveRequestForProduct($product);

                        if ($supportsWasSponsored) {
                            $orderItemData['was_sponsored'] = (bool) $activeSponsorshipRequest;
                        }

                        if ($supportsSponsorshipRequestId) {
                            $orderItemData['sponsorship_request_id'] = $activeSponsorshipRequest?->id;
                        }

                        if ($supportsSponsoredAtCheckout) {
                            $orderItemData['sponsored_at_checkout'] = $activeSponsorshipRequest ? now() : null;
                        }
                    }

                    $order->items()->create($orderItemData);
                }
                // Send email notification to seller
                $seller = User::find($artisanId);
                if ($seller && $seller->email) {
                    $order->load('items');
                    $this->sendMailSilently(
                        $seller->email,
                        new OrderPlaced($order),
                        'order_placed',
                        ['order_id' => $order->id, 'order_number' => $order->order_number]
                    );
                    $seller->notify(new \App\Notifications\NewOrderNotification($order));
                }
            }
        });

        // Remove ONLY purchasing items from cart (keep others)
        $cart = Session::get('cart', []);
        foreach ($request->items as $item) {
            $cartKey = $item['cart_key'] ?? null;

            if ($cartKey && isset($cart[$cartKey])) {
                unset($cart[$cartKey]);
                continue;
            }

            if (isset($cart[$item['id']])) {
                unset($cart[$item['id']]);
            }
        }
        Session::put('cart', $cart);

        return redirect()->route('my-orders.index')->with('success', 'Order placed successfully. The seller will confirm it and arrange delivery or pickup next.');
    }

    // ==========================================
    // BUYER ORDER MANAGEMENT
    // ==========================================

    /**
     * BUYER: View my orders
     */
    public function myOrders(PayMongoService $payMongoService, OrderLogisticsService $orderLogisticsService)
    {
        $userId = Auth::id();

        $this->reconcilePendingOnlinePaymentsForUser(Auth::user(), $payMongoService);

        $ordersQuery = Order::where('user_id', $userId)
            ->with(['items', 'user', 'artisan:id,name,shop_name', 'delivery'])
            ->latest();

        $initialOrders = (clone $ordersQuery)->get();
        $orderLogisticsService->syncVisibleDeliveries($initialOrders->pluck('delivery')->filter());

        $rawOrders = (clone $ordersQuery)->get();

        $productIds = $rawOrders
            ->flatMap(fn ($order) => $order->items->pluck('product_id'))
            ->filter()
            ->unique()
            ->values();

        $reviewsByProduct = Review::query()
            ->where('user_id', $userId)
            ->whereIn('product_id', $productIds)
            ->get()
            ->keyBy('product_id');

        $orders = $rawOrders->map(function ($order) use ($reviewsByProduct) {
                // Calculate if return is allowed (within 1 day of received_at)
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
                    'shipping_method' => $order->shipping_method, // New
                    'shipping_address' => $order->shipping_address, // New
                    'shipping_address_type' => $order->shipping_address_type,
                    'shipping_recipient_name' => $order->shipping_recipient_name,
                    'shipping_contact_phone' => $order->shipping_contact_phone,
                    'merchandise_subtotal' => number_format((float) $order->merchandise_subtotal, 2),
                    'convenience_fee_amount' => number_format((float) $order->convenience_fee_amount, 2),
                    'shipping_fee_amount' => number_format($order->getResolvedShippingFeeAmount(), 2),
                    'platform_commission_amount' => number_format($order->getResolvedPlatformCommissionAmount(), 2),
                    'seller_net_amount' => number_format($order->getResolvedSellerNetAmount(), 2),
                    'proof_of_delivery' => $order->proof_of_delivery ? '/storage/' . $order->proof_of_delivery : null, // New
                    'seller_id' => $order->artisan_id,
                    'seller_name' => $order->artisan?->shop_name ?? $order->artisan?->name ?? 'Shop',
                    'tracking_number' => $order->tracking_number,
                    'shipping_notes' => $order->shipping_notes,
                    'delivery' => $this->serializeDelivery($order->delivery),
                    'cancelled_at' => $order->cancelled_at?->format('M d, Y h:i A'),
                    'cancellation_reason' => $order->cancellation_reason,
                    'received_at' => $order->received_at?->format('M d, Y h:i A'),
                    'warranty_expires_at' => $order->warranty_expires_at?->format('M d, Y h:i A'),
                    'replacement_resolution_description' => $order->replacement_resolution_description,
                    'replacement_started_at' => $order->replacement_started_at?->format('M d, Y h:i A'),
                    'replacement_resolved_at' => $order->replacement_resolved_at?->format('M d, Y h:i A'),
                    'replacement_in_progress' => $replacementInProgress,
                    // Timeline timestamps
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
            });

        return Inertia::render('Buyer/MyOrders', [
            'orders' => $orders,
        ]);
    }

    /**
     * BUYER: Confirm order received - triggers 1-day warranty window
     */
    public function buyerReceiveOrder($id, OrderFinanceService $orderFinanceService)
    {
        $order = Order::where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        if ($order->status !== 'Delivered') {
            return redirect()->back()->with('error', 'You can confirm receipt only after the order is marked as delivered.');
        }

        if ($order->payment_method !== 'COD' && $order->payment_status !== 'paid') {
            return redirect()->back()->with('error', 'Cannot confirm receipt until payment is completed.');
        }

        $updateData = [
            'status' => 'Completed', // Auto-complete if paid
            'received_at' => now(),
            'warranty_expires_at' => now()->addDay() // 1-day return window
        ];

        if ($order->replacement_started_at !== null && $order->replacement_resolved_at === null) {
            $updateData['replacement_resolved_at'] = now();
        }

        // Only auto-mark as paid if it's COD. Online payments must be verified by PayMongo.
        if ($order->payment_method === 'COD') {
            $updateData['payment_status'] = 'paid';
        }

        $order->update($updateData);
        $order->refresh();
        $orderFinanceService->settleCompletedOrder($order);

        // Send delivery confirmation email to buyer
        $order->load('items');
        $buyer = Auth::user();
        if ($buyer && $buyer->email) {
            $this->sendMailSilently(
                $buyer->email,
                new OrderDelivered($order),
                'order_delivered',
                ['order_id' => $order->id, 'order_number' => $order->order_number]
            );
        }

        $successMessage = $order->replacement_started_at !== null && $order->replacement_resolved_at !== null
            ? 'Replacement received and order marked as completed.'
            : 'Order marked as received! You have 1 day to request a return if needed.';

        return redirect()->back()->with('success', $successMessage);
    }

    private function reconcilePendingOnlinePaymentsForUser(User $user, PayMongoService $payMongoService): void
    {
        Order::query()
            ->where('user_id', $user->id)
            ->where('payment_method', 'GCash')
            ->where('payment_status', 'pending')
            ->whereNotNull('paymongo_session_id')
            ->whereIn('status', ['Pending', 'Accepted'])
            ->get()
            ->each(function (Order $order) use ($payMongoService) {
                try {
                    $session = $payMongoService->retrieveCheckoutSession($order->paymongo_session_id);
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

    /**
     * BUYER: Request return/refund (within warranty period)
     */
    public function buyerRequestReturn(Request $request, $id)
    {
        $order = Order::where('id', $id)
            ->where('user_id', Auth::id())
            ->where('status', 'Completed')
            ->firstOrFail();

        // Check if within warranty period
        if (!$order->warranty_expires_at || now()->greaterThan($order->warranty_expires_at)) {
            return redirect()->back()->with('error', 'Return window has expired. Returns must be requested within 1 day of receiving your order.');
        }

        $request->validate([
            'return_reason' => 'required|string|max:1000',
            'return_proof_image' => 'required|image|max:5120', // 5MB Max
        ]);

        $updateData = [
            'status' => 'Refund/Return',
            'return_reason' => $request->return_reason
        ];

        if ($request->hasFile('return_proof_image')) {
            $path = $request->file('return_proof_image')->store('returns', 'public');
            $updateData['return_proof_image'] = $path;
        }

        $order->update($updateData);
        $order->refresh();

        $this->recordOrderAuditEvent(
            $order,
            $request->user(),
            eventType: 'return_requested',
            severity: 'warning',
            title: 'Buyer Requested Return',
            summary: "{$order->order_number} was moved to return review.",
            status: 'refund_return',
            details: [
                'before' => [
                    'status' => 'Completed',
                ],
                'after' => [
                    'status' => $order->status,
                    'return_reason' => $order->return_reason,
                ],
                'lines' => array_values(array_filter([
                    $order->return_reason ? "Reason: {$order->return_reason}" : null,
                    $request->hasFile('return_proof_image') ? 'Buyer submitted return proof image.' : null,
                ])),
            ],
        );

        // Send return notification to seller
        $order->load('items');
        $seller = User::find($order->artisan_id);
        if ($seller && $seller->email) {
            $this->sendMailSilently(
                $seller->email,
                new ReturnRequested($order),
                'return_requested',
                ['order_id' => $order->id, 'order_number' => $order->order_number]
            );
        }

        return redirect()->back()->with('success', 'Return request submitted. Please chat with the seller to negotiate.');
    }

    /**
     * BUYER: Cancel Return Request -> Mark as Completed
     */
    public function buyerCancelReturn($id, OrderFinanceService $orderFinanceService)
    {
        $order = Order::where('id', $id)
            ->where('user_id', Auth::id())
            ->where('status', 'Refund/Return')
            ->firstOrFail();

        // Cancelling return means accepting the item -> Complete the transaction
        $order->update([
            'status' => 'Completed',
        ]);
        $order->refresh();
        $orderFinanceService->settleCompletedOrder($order);

        return redirect()->back()->with('success', 'Return request cancelled. Order marked as Completed.');
    }

    /**
     * BUYER: Cancel pending order
     */
    public function buyerCancelOrder($id)
    {
        $order = Order::where('id', $id)
            ->where('user_id', Auth::id())
            ->where('status', 'Pending')
            ->with('items')
            ->firstOrFail();

        // Restore stock for each item in the cancelled order
        DB::transaction(function () use ($order) {
            foreach ($order->items as $item) {
                $product = Product::find($item->product_id);
                if ($product) {
                    $product->increment('stock', $item->quantity);
                    $product->decrement('sold', $item->quantity); // Revert sold count
                    // Sync to linked Supply
                    if ($product->track_as_supply && $product->supply) {
                        $product->supply->update(['quantity' => $product->stock]);
                    }
                }
            }
            
            $order->update([
                'status' => 'Cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => 'buyer_cancelled',
            ]);
        });

        return redirect()->back()->with('success', 'Order cancelled successfully.');
    }

    /**
     * BUYER: Download order receipt as printable HTML
     */
    public function downloadReceipt($id)
    {
        $order = Order::with(['items' => function ($query) {
            // BUG-L1 Fix: Only select safe fields from items
            $query->select('id', 'order_id', 'product_id', 'product_name', 'variant', 'quantity', 'price', 'product_img');
        }])
            ->where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        return view('pdf.receipt', ['order' => $order]);
    }

    /**
     * SELLER: Download receipt for one of the seller's own orders
     */
    public function sellerDownloadReceipt($id)
    {
        $order = Order::with(['items' => function ($query) {
            $query->select('id', 'order_id', 'product_id', 'product_name', 'variant', 'quantity', 'price', 'product_img');
        }])
            ->where('order_number', $id)
            ->where('artisan_id', $this->sellerOwnerId())
            ->firstOrFail();

        return view('pdf.receipt', ['order' => $order]);
    }

    /**
     * @return \Illuminate\Support\Collection<int|string, \Illuminate\Support\Collection<int, array{id:int, artisan_id:int, qty:int, variant:?string}>>
     */
    private function groupCheckoutItemsBySeller(array $items)
    {
        return collect($items)
            ->map(function (array $item) {
                $product = Product::findOrFail($item['id']);

                return [
                    'id' => $product->id,
                    'artisan_id' => $product->artisan_id ?? $product->user_id,
                    'qty' => (int) $item['qty'],
                    'variant' => $item['variant'] ?? null,
                ];
            })
            ->groupBy('artisan_id');
    }

    /**
     * @return array{
     *     selected_address: mixed,
     *     shipping_address: string,
     *     shipping_address_type: ?string,
     *     shipping_recipient_name: ?string,
     *     shipping_contact_phone: ?string,
     *     shipping_street_address: ?string,
     *     shipping_barangay: ?string,
     *     shipping_city: ?string,
     *     shipping_region: ?string,
     *     shipping_postal_code: ?string
     * }
     */
    private function resolveCheckoutDeliveryContext(Request $request, User $buyer, bool $requireContactDetails): array
    {
        $selectedAddressId = $request->input('selected_address_id');
        $selectedAddress = null;

        $shippingAddressType = null;
        $shippingRecipientName = null;
        $shippingContactPhone = null;
        $shippingStreetAddress = null;
        $shippingBarangay = null;
        $shippingCity = null;
        $shippingRegion = null;
        $shippingPostalCode = null;

        if ($selectedAddressId !== null && $selectedAddressId !== '' && $selectedAddressId !== 'new') {
            if (!is_scalar($selectedAddressId) || !ctype_digit((string) $selectedAddressId)) {
                throw ValidationException::withMessages([
                    'selected_address_id' => 'Select a valid saved address or choose a new delivery address.',
                ]);
            }

            $selectedAddress = $buyer->addresses()->find((int) $selectedAddressId);

            if (!$selectedAddress) {
                throw ValidationException::withMessages([
                    'selected_address_id' => 'Select a valid saved address or choose a new delivery address.',
                ]);
            }

            $shippingStreetAddress = StructuredAddress::clean($selectedAddress->street_address);
            $shippingBarangay = StructuredAddress::clean($selectedAddress->barangay);
            $shippingCity = StructuredAddress::clean($selectedAddress->city);
            $shippingRegion = StructuredAddress::clean($selectedAddress->region);
            $shippingPostalCode = StructuredAddress::clean($selectedAddress->postal_code);
            $shippingAddress = $selectedAddress->full_address ?: StructuredAddress::formatPhilippineAddress([
                'street_address' => $shippingStreetAddress,
                'barangay' => $shippingBarangay,
                'city' => $shippingCity,
                'region' => $shippingRegion,
                'postal_code' => $shippingPostalCode,
            ]);
            $shippingAddressType = $selectedAddress->address_type ?: 'home';
            $shippingRecipientName = $request->filled('recipient_name')
                ? $request->input('recipient_name')
                : ($selectedAddress->recipient_name ?: $buyer->name);
            $shippingContactPhone = $request->filled('phone_number')
                ? $request->input('phone_number')
                : ($selectedAddress->phone_number ?: $buyer->phone_number);
        } else {
            $hasStructuredShippingInput = collect([
                $request->input('shipping_street_address'),
                $request->input('shipping_barangay'),
                $request->input('shipping_city'),
                $request->input('shipping_region'),
                $request->input('shipping_postal_code'),
            ])->contains(fn ($value) => StructuredAddress::clean($value) !== null);

            if ($hasStructuredShippingInput) {
                $request->validate([
                    'shipping_street_address' => 'required|string|max:255',
                    'shipping_barangay' => 'required|string|max:255',
                    'shipping_city' => 'required|string|max:255',
                    'shipping_region' => 'required|string|max:255',
                    'shipping_postal_code' => 'nullable|string|max:20',
                    'shipping_address_type' => 'required|string|in:home,office,other',
                ]);

                $shippingStreetAddress = StructuredAddress::clean($request->shipping_street_address);
                $shippingBarangay = StructuredAddress::clean($request->shipping_barangay);
                $shippingCity = StructuredAddress::clean($request->shipping_city);
                $shippingRegion = StructuredAddress::clean($request->shipping_region);
                $shippingPostalCode = StructuredAddress::clean($request->shipping_postal_code);
                $shippingAddress = StructuredAddress::formatPhilippineAddress([
                    'street_address' => $shippingStreetAddress,
                    'barangay' => $shippingBarangay,
                    'city' => $shippingCity,
                    'region' => $shippingRegion,
                    'postal_code' => $shippingPostalCode,
                ]);
            } else {
                $request->validate([
                    'shipping_address' => 'required|string',
                    'shipping_address_type' => 'required|string|in:home,office,other',
                ]);

                $shippingAddress = (string) $request->shipping_address;
            }

            $shippingAddressType = $request->input('shipping_address_type');
            $shippingRecipientName = $request->filled('recipient_name')
                ? $request->input('recipient_name')
                : $buyer->name;
            $shippingContactPhone = $request->filled('phone_number')
                ? $request->input('phone_number')
                : $buyer->phone_number;
        }

        if ($requireContactDetails && (blank($shippingRecipientName) || blank($shippingContactPhone))) {
            throw ValidationException::withMessages([
                'phone_number' => 'Recipient name and phone number are required for delivery bookings.',
            ]);
        }

        return [
            'selected_address' => $selectedAddress,
            'shipping_address' => (string) $shippingAddress,
            'shipping_address_type' => $shippingAddressType,
            'shipping_recipient_name' => $shippingRecipientName,
            'shipping_contact_phone' => $shippingContactPhone,
            'shipping_street_address' => $shippingStreetAddress,
            'shipping_barangay' => $shippingBarangay,
            'shipping_city' => $shippingCity,
            'shipping_region' => $shippingRegion,
            'shipping_postal_code' => $shippingPostalCode,
        ];
    }

    private function serializeDelivery(?OrderDelivery $delivery): ?array
    {
        if (!$delivery) {
            return null;
        }

        $status = strtoupper((string) $delivery->status);
        $holdEndsAt = $delivery->terminal_failed_at?->copy()->addDay();
        $flowType = (string) (data_get($delivery->order_payload, 'metadata.flowType') ?: 'standard_delivery');
        $isReplacementExchange = $flowType === 'replacement_exchange';

        return [
            'provider' => $delivery->provider,
            'status' => $status,
            'service_type' => $delivery->service_type,
            'external_order_id' => $delivery->external_order_id,
            'quotation_id' => $delivery->quotation_id,
            'share_link' => $delivery->share_link,
            'price_total' => $delivery->price_total !== null ? number_format((float) $delivery->price_total, 2) : null,
            'price_currency' => $delivery->price_currency,
            'failure_reason' => $delivery->failure_reason,
            'terminal_failed_at' => $delivery->terminal_failed_at?->format('M d, Y h:i A'),
            'auto_cancelled_at' => $delivery->auto_cancelled_at?->format('M d, Y h:i A'),
            'pending_auto_cancel' => $delivery->terminal_failed_at !== null && $delivery->auto_cancelled_at === null,
            'cancel_hold_ends_at' => $holdEndsAt?->format('M d, Y h:i A'),
            'last_updated_at' => $delivery->last_webhook_received_at?->format('M d, Y h:i A') ?? $delivery->updated_at?->format('M d, Y h:i A'),
            'flow_type' => $flowType,
            'flow_label' => $isReplacementExchange ? 'Replacement Exchange' : 'Standard Delivery',
            'flow_summary' => $isReplacementExchange
                ? 'Courier will deliver the replacement item to the buyer, collect the rejected item, and return it to the seller.'
                : 'Courier will move the order from the seller to the buyer.',
            'route_legs' => $isReplacementExchange
                ? [
                    ['label' => 'Replacement delivery', 'from' => 'Seller', 'to' => 'Buyer'],
                    ['label' => 'Rejected item return', 'from' => 'Buyer', 'to' => 'Seller'],
                ]
                : [
                    ['label' => 'Delivery', 'from' => 'Seller', 'to' => 'Buyer'],
                ],
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function buildOrderTimeline(Order $order): array
    {
        $entries = collect();

        $pushEntry = function (
            string $key,
            ?\Carbon\CarbonInterface $timestamp,
            string $label,
            ?string $description = null,
            string $source = 'order'
        ) use (&$entries): void {
            if (!$timestamp) {
                return;
            }

            $entries->push([
                'key' => $key,
                'label' => $label,
                'description' => $description,
                'source' => $source,
                'timestamp' => $timestamp->toIso8601String(),
            ]);
        };

        $pushEntry('order_placed', $order->created_at, 'Order placed', 'Buyer submitted the order.');
        $pushEntry('order_accepted', $order->accepted_at, 'Order accepted', 'Seller confirmed the order.');

        if ($order->shipping_method === 'Pick Up') {
            $pushEntry(
                'pickup_ready',
                $order->shipped_at,
                'Ready for pickup',
                'Seller marked the order as ready for buyer pickup.'
            );
            $pushEntry(
                'pickup_completed',
                $order->delivered_at,
                'Picked up',
                'Seller marked the order as picked up by the buyer.'
            );
        } else {
            $pushEntry(
                'order_shipped',
                $order->shipped_at,
                'Order shipped',
                $order->tracking_number
                    ? 'Tracking number: ' . $order->tracking_number
                    : 'Seller marked the order as shipped.'
            );
            $pushEntry(
                'order_delivered',
                $order->delivered_at,
                'Marked as delivered',
                'Seller or courier marked the order as delivered.'
            );
        }

        $pushEntry('buyer_confirmed', $order->received_at, 'Buyer confirmed receipt', 'Buyer marked the order as received.');
        $pushEntry('order_cancelled', $order->cancelled_at, 'Order cancelled', $order->cancellation_reason ? 'Reason: ' . $order->cancellation_reason : null);
        $pushEntry('replacement_started', $order->replacement_started_at, 'Replacement started', $order->replacement_resolution_description ?: 'Seller approved a replacement workflow.');
        $pushEntry('replacement_resolved', $order->replacement_resolved_at, 'Replacement resolved', 'Buyer confirmed receipt of the replacement item.');

        if ($order->relationLoaded('delivery') && $order->delivery) {
            $order->delivery->loadMissing('events');

            $order->delivery->events
                ->sortByDesc('created_at')
                ->each(function (OrderDeliveryEvent $event) use (&$entries) {
                    $entries->push([
                        'key' => 'delivery_event_' . $event->id,
                        'label' => $this->deliveryEventLabel($event),
                        'description' => $this->deliveryEventDescription($event),
                        'source' => 'courier',
                        'timestamp' => optional($event->created_at)?->toIso8601String(),
                    ]);
                });
        }

        $currentStatusTimestamp = $order->updated_at;
        if ($currentStatusTimestamp) {
            $entries->push([
                'key' => 'current_status',
                'label' => 'Current status: ' . $order->status,
                'description' => null,
                'source' => 'status',
                'timestamp' => $currentStatusTimestamp->toIso8601String(),
            ]);
        }

        return $entries
            ->filter(fn (array $entry) => !empty($entry['timestamp']))
            ->sortByDesc('timestamp')
            ->unique(fn (array $entry) => $entry['key'])
            ->values()
            ->take(8)
            ->all();
    }

    private function deliveryEventLabel(OrderDeliveryEvent $event): string
    {
        $eventType = strtoupper((string) $event->event_type);
        $payloadStatus = strtoupper((string) (data_get($event->payload, 'data.status') ?? ''));

        return match (true) {
            $eventType === 'DRIVER_ASSIGNED' => 'Courier assigned',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'COMPLETED' => 'Courier completed delivery',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'PICKED_UP' => 'Courier picked up parcel',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'ON_GOING' => 'Courier started trip',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'CANCELED' => 'Courier cancelled booking',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'REJECTED' => 'Courier rejected booking',
            $eventType === 'ORDER_STATUS_CHANGED' && $payloadStatus === 'EXPIRED' => 'Courier booking expired',
            $eventType === 'POLL_SYNC' => 'Courier status synced',
            default => str_replace('_', ' ', ucfirst(strtolower($eventType ?: 'delivery update'))),
        };
    }

    private function deliveryEventDescription(OrderDeliveryEvent $event): ?string
    {
        $payloadStatus = strtoupper((string) (data_get($event->payload, 'data.status') ?? ''));

        if ($payloadStatus !== '') {
            return 'Lalamove status: ' . str_replace('_', ' ', ucfirst(strtolower($payloadStatus)));
        }

        if ($event->external_order_id) {
            return 'Courier order ID: ' . $event->external_order_id;
        }

        return null;
    }

    private function lalamoveBookingRequirements(Order $order, User $seller): array
    {
        $seller->loadMissing('addresses');

        $requirements = [];
        $pickupAddress = $seller->getPreferredCourierPickupAddress();
        $buyerStructuredAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $order->shipping_street_address,
            'barangay' => $order->shipping_barangay,
            'city' => $order->shipping_city,
            'region' => $order->shipping_region,
            'postal_code' => $order->shipping_postal_code,
        ]);
        $dropoffAddress = $buyerStructuredAddress !== '' ? $buyerStructuredAddress : trim((string) $order->shipping_address);

        if (blank($pickupAddress)) {
            $requirements[] = 'Add a default seller Address Book entry with a full address, or complete the primary shop address.';
        } elseif (!StructuredAddress::looksPreciseEnoughForCourier($pickupAddress)) {
            $requirements[] = 'Seller pickup address is too broad. Add street, barangay, city, and province.';
        }

        if (blank($seller->getPreferredCourierContactPhone())) {
            $requirements[] = 'Add a seller contact number in your profile or default Address Book.';
        }

        if ($dropoffAddress === '') {
            $requirements[] = 'Buyer shipping address is missing.';
        } elseif (!StructuredAddress::looksPreciseEnoughForCourier($dropoffAddress)) {
            $requirements[] = 'Buyer delivery address is too broad. Complete the street, barangay, city, and province.';
        }

        if (blank($order->shipping_recipient_name)) {
            $requirements[] = 'Buyer recipient name is missing.';
        }

        if (blank($order->shipping_contact_phone)) {
            $requirements[] = 'Buyer contact number is missing.';
        }

        if (
            $pickupAddress !== null
            && $dropoffAddress !== ''
            && StructuredAddress::normalizeForComparison($pickupAddress) !== ''
            && StructuredAddress::normalizeForComparison($pickupAddress) === StructuredAddress::normalizeForComparison($dropoffAddress)
        ) {
            $requirements[] = 'Seller pickup and buyer drop-off cannot be the same address.';
        }

        return $requirements;
    }

    /**
     * @param  array<string, mixed>  $details
     */
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

    private function sendMailSilently(string $recipient, Mailable $mailable, string $context, array $extraContext = []): void
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
