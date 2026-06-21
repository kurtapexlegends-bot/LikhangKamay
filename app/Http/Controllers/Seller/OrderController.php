<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Models\User;
use App\Models\SellerActivityLog;
use App\Http\Requests\CheckoutRequest;
use App\Services\OrderFinanceService;
use App\Actions\Seller\Orders\ListSellerOrders;
use App\Actions\Seller\Orders\ExportOrdersCsv;
use App\Actions\Seller\Orders\UpdateOrderStatus;
use App\Actions\Seller\Orders\ApproveOrderRefund;
use App\Actions\Seller\Orders\ApproveOrderReplacement;
use App\Actions\Consumer\QuoteCheckoutShipping;
use App\Actions\Consumer\PrepareCheckout;
use App\Actions\Consumer\PlaceOrder;
use App\Actions\Consumer\GetBuyerOrders;
use App\Actions\Consumer\ReceiveOrder;
use App\Actions\Consumer\RequestOrderReturn;
use App\Actions\Consumer\CancelOrderReturn;
use App\Actions\Consumer\CancelOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class OrderController extends Controller
{
    use InteractsWithSellerContext;

    /**
     * SELLER: View all orders for the logged-in artisan
     */
    public function index(Request $request, ListSellerOrders $listSellerOrders)
    {
        $sellerId = $this->sellerOwnerId();
        $seller = $this->sellerOwner();

        $result = $listSellerOrders->execute(
            $sellerId,
            $seller,
            $request->only(['search', 'start_date', 'end_date', 'status', 'quick_filter'])
        );

        return Inertia::render('Seller/Orders/OrderManager', [
            'orders' => $result['orders'],
            'tabCounts' => $result['tabCounts']
        ]);
    }

    /**
     * SELLER: Export orders to CSV
     */
    public function export(ExportOrdersCsv $exportOrdersCsv)
    {
        $sellerId = $this->sellerOwnerId();
        return $exportOrdersCsv->execute($sellerId);
    }

    /**
     * BUYER: Checkout page - prepare order
     */
    public function create(Request $request, PrepareCheckout $prepareCheckout)
    {
        if (Auth::check() && in_array(Auth::user()->role, ['super_admin', 'admin'], true)) {
            abort(403, 'Administrators are not permitted to make purchases.');
        }

        $items = $prepareCheckout->execute($request);

        if (empty($items)) {
            return redirect()->route('cart.index')->with('error', 'Your cart is empty.');
        }

        /** @var \App\Models\User|null $user */
        $user = Auth::user();

        return Inertia::render('Consumer/Shop/Checkout', [
            'items' => $items,
            'pricing' => OrderFinanceService::getPricingData(),
            'auth' => [
                'user' => $user?->load('addresses'),
            ]
        ]);
    }

    /**
     * BUYER: Get shipping quote for checkout items
     */
    public function quoteShipping(Request $request, QuoteCheckoutShipping $quoteCheckoutShipping)
    {
        if (Auth::check() && in_array(Auth::user()->role, ['super_admin', 'admin'], true)) {
            abort(403, 'Administrators are not permitted to make purchases.');
        }

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

        $result = $quoteCheckoutShipping->execute($request, $buyer);

        return response()->json($result);
    }

    /**
     * BUYER: Place a new order
     */
    public function store(CheckoutRequest $request, PlaceOrder $placeOrder)
    {
        if (Auth::check() && in_array(Auth::user()->role, ['super_admin', 'admin'], true)) {
            abort(403, 'Administrators are not permitted to make purchases.');
        }

        try {
            $placeOrder->execute($request, $request->user());
            return redirect()->route('my-orders.index')->with('success', 'Order placed successfully. The seller will confirm it and arrange delivery or pickup next.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * BUYER: View my orders
     */
    public function myOrders(GetBuyerOrders $getBuyerOrders)
    {
        $orders = $getBuyerOrders->execute(Auth::user());

        return Inertia::render('Consumer/Buyer/MyOrders', [
            'orders' => $orders,
        ]);
    }

    /**
     * BUYER: Confirm order received - triggers 1-day warranty window
     */
    public function buyerReceiveOrder(string $id, ReceiveOrder $receiveOrder)
    {
        try {
            $successMessage = $receiveOrder->execute($id, Auth::user());
            return redirect()->back()->with('success', $successMessage);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * BUYER: Request return/refund (within warranty period)
     */
    public function buyerRequestReturn(Request $request, string $id, RequestOrderReturn $requestOrderReturn)
    {
        $request->validate([
            'return_reason' => 'required|string|max:1000',
            'return_proof_image' => 'required|image|max:5120',
        ]);

        $proofPath = null;
        if ($request->hasFile('return_proof_image')) {
            $proofPath = $request->file('return_proof_image')->store('returns', 'public');
        }

        try {
            $requestOrderReturn->execute($id, $request->return_reason, $proofPath, $request->user());
            return redirect()->back()->with('success', 'Return request submitted. Please chat with the seller to negotiate.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * BUYER: Cancel Return Request -> Mark as Completed
     */
    public function buyerCancelReturn(string $id, CancelOrderReturn $cancelOrderReturn)
    {
        try {
            $cancelOrderReturn->execute($id, Auth::user());
            return redirect()->back()->with('success', 'Return request cancelled. Order marked as Completed.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * BUYER: Cancel pending order
     */
    public function buyerCancelOrder(string $id, CancelOrder $cancelOrder)
    {
        try {
            $cancelOrder->execute($id, Auth::user());
            return redirect()->back()->with('success', 'Order cancelled successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * SELLER: Update order status (Accept, Ship, Deliver, Reject, etc.)
     */
    public function update(Request $request, string $id, UpdateOrderStatus $updateOrderStatus)
    {
        $request->validate([
            'status' => 'required|string|in:Accepted,Processing,Rejected,Shipped,Ready for Pickup,Delivered,Completed,Cancelled',
            'tracking_number' => 'nullable|string|max:100',
            'shipping_notes' => 'nullable|string|max:500',
            'proof_of_delivery' => 'nullable|image|max:5120'
        ]);

        $order = Order::where('order_number', $id)
            ->where('artisan_id', $this->sellerOwnerId())
            ->firstOrFail();

        $proofPath = null;
        if ($request->hasFile('proof_of_delivery')) {
            $proofPath = $request->file('proof_of_delivery')->store('proofs', 'public');
        }

        try {
            $updateOrderStatus->execute(
                $order,
                $request->only(['status', 'tracking_number', 'shipping_notes']),
                $request->user(),
                $proofPath
            );
            return redirect()->back()->with('success', 'Order status updated successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * SELLER: Approve return request
     */
    public function approveReturn(
        Request $request,
        string $id,
        ApproveOrderRefund $approveOrderRefund,
        ApproveOrderReplacement $approveOrderReplacement
    ) {
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
                $approveOrderRefund->execute($order, $request->user());
                return back()->with('success', 'Return approved and marked as refunded.');
            } catch (\Throwable $e) {
                $message = $e->getMessage() === 'This return request is no longer pending.'
                    ? $e->getMessage()
                    : 'Refund could not be completed right now.';
                return back()->with('error', $message);
            }
        } else {
            try {
                $resolutionDescription = trim((string) $request->replacement_resolution_description);
                $message = $approveOrderReplacement->execute(
                    $order,
                    $resolutionDescription,
                    $request->user(),
                    $this->sellerOwner()
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
    public function updatePaymentStatus(Request $request, string $id)
    {
        $request->validate([
            'payment_status' => 'required|string|in:paid'
        ]);

        try {
            DB::transaction(function () use ($id, $request) {
                $order = Order::lockForUpdate()->where('order_number', $id)
                    ->where('artisan_id', $this->sellerOwnerId())
                    ->firstOrFail();

                if ($order->payment_method !== 'COD') {
                    throw new \Exception('Only cash on delivery orders can be marked paid manually.');
                }

                if (in_array($order->status, ['Refunded', 'Cancelled', 'Rejected'], true)) {
                    throw new \Exception('Payment status can no longer be changed for this order.');
                }

                if ($order->payment_status === 'paid') {
                    return;
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
            });

            return redirect()->back()->with('success', 'Payment status updated.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * BUYER: Download order receipt as printable HTML
     */
    public function downloadReceipt(string $id)
    {
        $order = Order::with(['items' => function ($query) {
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
    public function sellerDownloadReceipt(string $id)
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
     * SELLER: Bulk print labels
     */
    public function bulkLabels(Request $request)
    {
        $idsString = $request->query('ids', '');
        if (empty($idsString)) {
            return back()->with('error', 'No orders selected for printing.');
        }

        $ids = explode(',', $idsString);
        $sellerId = $this->sellerOwnerId();

        $orders = Order::where('artisan_id', $sellerId)
            ->whereIn('order_number', $ids)
            ->with(['items.product', 'user', 'delivery'])
            ->get();

        return Inertia::render('Seller/Orders/BulkLabels', [
            'orders' => $orders->map(function ($order) {
                return [
                    'id' => $order->order_number,
                    'customer' => $order->customer_name,
                    'address' => $order->shipping_address,
                    'phone' => $order->shipping_contact_phone,
                    'items' => $order->items->map(fn($i) => [
                        'name' => $i->product->name,
                        'qty' => $i->quantity,
                    ]),
                    'shipping_method' => $order->shipping_method,
                    'notes' => $order->shipping_notes,
                ];
            })
        ]);
    }

    /**
     * Record order audit event helper
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
}
