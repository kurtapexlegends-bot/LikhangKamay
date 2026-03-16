<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Order;
use App\Models\Review;
use App\Models\User;
use App\Mail\OrderPlaced;
use App\Mail\OrderAccepted;
use App\Mail\OrderShipped;
use App\Mail\OrderDelivered;
use App\Mail\ReturnRequested;
use App\Mail\RefundProcessed;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;


class OrderController extends Controller
{
    /**
     * SELLER: View all orders for the logged-in artisan
     */
    public function index()
    {
        $orders = Order::where('artisan_id', Auth::id())
            ->with(['items', 'user']) // Load items and buyer info
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($order) {
                return [
                    'id' => $order->order_number,
                    'db_id' => $order->id,
                    'date' => $order->created_at->format('M d, Y • h:i A'),
                    'customer' => $order->customer_name,
                    'user_id' => $order->user_id, // For chat linking
                    'status' => $order->status,
                    'payment_status' => $order->payment_status ?? 'pending',
                    'payment_method' => $order->payment_method,
                    'total' => number_format($order->total_amount, 2),
                    'shipping_address' => $order->shipping_address,
                    'shipping_method' => $order->shipping_method, // New
                    'shipping_notes' => $order->shipping_notes,
                    'tracking_number' => $order->tracking_number,
                    'proof_of_delivery' => $order->proof_of_delivery ? '/storage/' . $order->proof_of_delivery : null, // New
                    'return_reason' => $order->return_reason,
                    'return_proof_image' => $order->return_proof_image ? '/storage/' . $order->return_proof_image : null,
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
        $orders = Order::where('artisan_id', Auth::id())
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

            if ($product) {
                $items[] = [
                    'id' => $product->id,
                    'artisan_id' => $product->artisan_id ?? $product->user_id,
                    'shop_name' => $product->user->shop_name ?? 'Shop',
                    'name' => $product->name,
                    'variant' => 'Standard', // Default variant
                    'price' => $product->price,
                    'qty' => $request->input('quantity', 1), // Accept quantity from request
                    'img' => $product->img // Already a full URL from the model accessor
                ];
            }
        }
        // CASE 2: Checkout from Cart
        else {
            $cart = Session::get('cart', []);
            $selectedIds = $request->input('items'); // Array of IDs if passed from Cart

            if (!empty($selectedIds) && is_array($selectedIds)) {
                // Filter cart to only selected items
                $items = array_filter($cart, function ($item) use ($selectedIds) {
                    return in_array($item['id'], $selectedIds);
                });
            } else {
                // Default: All items
                $items = $cart;
            }

            $items = array_values($items);

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

        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        return Inertia::render('Shop/Checkout', [
            'items' => $items,
            'auth' => [
                'user' => $user->load('addresses'),
            ]
        ]);
    }

    /**
     * SELLER: Update order status (Accept, Ship, Deliver, Reject, etc.)
     */
    public function update(Request $request, $id)
    {
        $order = Order::where('order_number', $id)
            ->where('artisan_id', Auth::id())
            ->firstOrFail();

        $request->validate([
            'status' => 'required|string|in:Accepted,Rejected,Shipped,Ready for Pickup,Delivered,Completed,Cancelled',
            'tracking_number' => 'nullable|string|max:100',
            'shipping_notes' => 'nullable|string|max:500',
            'proof_of_delivery' => 'nullable|image|max:5120' // 5MB Max
        ]);

        // GUARD: Prevent shipping unpaid non-COD orders
        if (in_array($request->status, ['Shipped', 'Ready for Pickup'])) {
            if ($order->payment_method !== 'COD' && $order->payment_status !== 'paid') {
                return back()->with('error', 'Cannot ship unpaid order. Please wait for payment.');
            }
        }

        $updateData = ['status' => $request->status];

        // Ensure Proof of Delivery is present BEFORE any database writes or side effects if the new status requires it.
        if (in_array($request->status, ['Shipped', 'Ready for Pickup', 'Delivered'])) {
            if (!$request->hasFile('proof_of_delivery') && !$order->proof_of_delivery) {
                 return back()->with('error', 'Proof of Delivery (Image) is required to mark as ' . $request->status);
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
            // Ensure payment is collected
            $updateData['payment_status'] = 'paid';
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

        $order->update($updateData);

        // Send email notifications based on status change
        $order->load(['items', 'user']);
        $buyer = $order->user;

        if ($buyer && $buyer->email) {
            if ($request->status === 'Accepted') {
                Mail::to($buyer->email)->queue(new OrderAccepted($order));
            } elseif ($request->status === 'Shipped') {
                Mail::to($buyer->email)->queue(new OrderShipped($order));
            }
        }

        return redirect()->back();
    }

    /**
     * SELLER: Approve return request
     */
    public function approveReturn(Request $request, $id)
    {
        $order = Order::where('order_number', $id)
            ->where('artisan_id', Auth::id())
            ->where('status', 'Refund/Return')
            ->firstOrFail();

        $request->validate([
            'action_type' => 'required|in:refund,replace',
        ]);

        if ($request->action_type === 'refund') {
            // Money Refund: No stock change (seller writes it off), mark as Refunded
            $order->update([
                'status' => 'Refunded',
                'payment_status' => 'refunded'
            ]);
            
            // Send refund email to buyer
            $order->load('user');
            $buyer = $order->user;
            if ($buyer && $buyer->email) {
                Mail::to($buyer->email)->send(new RefundProcessed($order));
            }
            
            return back()->with('success', 'Return approved. Money refunded (simulation).');
        } else {
            // Product Replacement: Validate and deduct stock securely inside a transaction
            try {
                DB::transaction(function () use ($order) {
                    foreach ($order->items as $item) {
                        $product = Product::lockForUpdate()->find($item->product_id);
                        
                        if (!$product || $product->stock < $item->quantity) {
                            throw new \Exception("Insufficient stock to replace " . ($product ? $product->name : 'Unknown Product') . ". Requires {$item->quantity} but only " . ($product ? $product->stock : 0) . " left.");
                        }
                        
                        $product->decrement('stock', $item->quantity);
                        if ($product->track_as_supply && $product->supply) {
                            $product->supply->update(['quantity' => $product->stock]);
                        }
                    }
                    $order->update(['status' => 'Replaced']);
                });
                return back()->with('success', 'Return approved. Replacement stock deducted.');
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
            ->where('artisan_id', Auth::id())
            ->firstOrFail();

        $request->validate([
            'payment_status' => 'required|string|in:pending,paid,refunded'
        ]);

        $order->update(['payment_status' => $request->payment_status]);

        return redirect()->back()->with('success', 'Payment status updated.');
    }

    /**
     * BUYER: Place a new order
     */
    public function store(Request $request)
    {
        $request->validate([
            'items' => 'required|array',
            'items.*.qty' => 'required|integer|min:1',
            'shipping_method' => 'required|string|in:Delivery,Pick Up',
            'shipping_address' => 'required_if:shipping_method,Delivery|nullable|string',
            'payment_method' => 'required|string',
            'total' => 'required|numeric',
            'shipping_notes' => 'nullable|string',
            'save_address' => 'nullable|boolean'
        ]);

        // Handle Address for Pick Up
        $shippingAddress = $request->shipping_method === 'Pick Up' 
            ? 'Store Pick-up - Negotiate via Chat' 
            : $request->shipping_address;

        // Force COD for Pick Up
        $paymentMethod = $request->shipping_method === 'Pick Up' ? 'COD' : $request->payment_method;

        // Save address if requested (Only for Delivery)
        if ($request->save_address && $request->shipping_method === 'Delivery') {
            /** @var User $user */
            $user = $request->user();
            $user->update(['saved_address' => $request->shipping_address]);
        }

        // Group items by artisan for multi-seller support
        $groupedItems = collect($request->items)->groupBy('artisan_id');

        // Wrap in transaction to ensure stock is deducted only if order succeeds
        DB::transaction(function () use ($request, $groupedItems, $shippingAddress, $paymentMethod) {
            foreach ($groupedItems as $artisanId => $items) {
                // Recalculate server order total using DB prices securely
                $serverOrderTotal = 0;
                foreach ($items as $item) {
                     $p = \App\Models\Product::find($item['id']);
                     if ($p) $serverOrderTotal += $p->price * $item['qty'];
                }
                
                // Set initial payment status
                $paymentStatus = 'pending';
                
                $order = Order::create([
                    'order_number' => 'ORD-' . strtoupper(uniqid()),
                    'user_id' => Auth::id(),
                    'artisan_id' => $artisanId,
                    'customer_name' => Auth::user()->name,
                    'total_amount' => $serverOrderTotal,
                    'status' => 'Pending',
                    'shipping_address' => $shippingAddress,
                    'shipping_notes' => $request->shipping_notes,
                    'payment_method' => $paymentMethod,
                    'payment_status' => $paymentStatus,
                    'shipping_method' => $request->shipping_method,
                ]);

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
                    $order->items()->create([
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'variant' => $item['variant'] ?? null,
                        'price' => $product->price, // Secure DB price
                        'cost' => $product->cost_price ?? 0,
                        'quantity' => $item['qty'],
                        'product_img' => $product->cover_photo_path // Use the actual DB path
                    ]);
                }

                // Send email notification to seller
                $seller = User::find($artisanId);
                if ($seller && $seller->email) {
                    $order->load('items'); 
                    Mail::to($seller->email)->queue(new OrderPlaced($order));
                    $seller->notify(new \App\Notifications\NewOrderNotification($order));
                }
            }
        });

        // Remove ONLY purchasing items from cart (keep others)
        $cart = Session::get('cart', []);
        foreach ($request->items as $item) {
            if (isset($cart[$item['id']])) {
                unset($cart[$item['id']]);
            }
        }
        Session::put('cart', $cart);

        return redirect()->route('my-orders.index')->with('success', 'Order placed successfully! Chat with the seller to discuss shipping.');
    }

    // ==========================================
    // BUYER ORDER MANAGEMENT
    // ==========================================

    /**
     * BUYER: View my orders
     */
    public function myOrders()
    {
        $userId = Auth::id();

        $orders = Order::where('user_id', $userId)
            ->with(['items', 'user'])
            ->latest()
            ->get()
            ->map(function ($order) use ($userId) {
                // Calculate if return is allowed (within 1 day of received_at)
                $canReturn = false;
                if ($order->status === 'Completed' && $order->warranty_expires_at) {
                    $canReturn = now()->lessThanOrEqualTo($order->warranty_expires_at);
                }

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
                    'proof_of_delivery' => $order->proof_of_delivery ? '/storage/' . $order->proof_of_delivery : null, // New
                    'seller_id' => $order->artisan_id,
                    'tracking_number' => $order->tracking_number,
                    'shipping_notes' => $order->shipping_notes,
                    'received_at' => $order->received_at?->format('M d, Y h:i A'),
                    'warranty_expires_at' => $order->warranty_expires_at?->format('M d, Y h:i A'),
                    // Timeline timestamps
                    'created_at_raw' => $order->created_at?->format('M d, Y h:i A'),
                    'accepted_at' => $order->accepted_at?->format('M d, Y h:i A'),
                    'shipped_at' => $order->shipped_at?->format('M d, Y h:i A'),
                    'delivered_at' => $order->delivered_at?->format('M d, Y h:i A'),
                    'items' => $order->items->map(function ($item) use ($userId) {
                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'is_rated' => Review::where('user_id', $userId)->where('product_id', $item->product_id)->exists(),
                            'name' => $item->product_name,
                            'img' => $item->product_img 
                                ? (str_starts_with($item->product_img, 'http') ? $item->product_img : '/storage/' . $item->product_img)
                                : '/images/placeholder.svg',
                            'price' => $item->price,
                            'qty' => $item->quantity,
                            'variant' => $item->variant ?? 'Standard'
                        ];
                    }),
                    'can_return' => $canReturn,
                    'can_cancel' => $order->status === 'Pending'
                ];
            });

        return Inertia::render('Buyer/MyOrders', [
            'orders' => $orders
        ]);
    }

    /**
     * BUYER: Confirm order received - triggers 1-day warranty window
     */
    public function buyerReceiveOrder($id)
    {
        $order = Order::where('id', $id)
            ->where('user_id', Auth::id())
            ->whereIn('status', ['Shipped', 'Ready for Pickup', 'Delivered'])
            ->firstOrFail();

        $updateData = [
            'status' => 'Completed', // Auto-complete if paid
            'received_at' => now(),
            'warranty_expires_at' => now()->addDay() // 1-day return window
        ];

        // Only auto-mark as paid if it's COD. E-wallet orders must be verified by PayMongo.
        if ($order->payment_method === 'COD') {
            $updateData['payment_status'] = 'paid';
        }

        $order->update($updateData);

        // Send delivery confirmation email to buyer
        $order->load('items');
        $buyer = Auth::user();
        if ($buyer && $buyer->email) {
            Mail::to($buyer->email)->queue(new OrderDelivered($order));
        }

        return redirect()->back()->with('success', 'Order marked as received! You have 1 day to request a return if needed.');
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

        // Send return notification to seller
        $order->load('items');
        $seller = User::find($order->artisan_id);
        if ($seller && $seller->email) {
            Mail::to($seller->email)->queue(new ReturnRequested($order));
        }

        return redirect()->back()->with('success', 'Return request submitted. Please chat with the seller to negotiate.');
    }

    /**
     * BUYER: Cancel Return Request -> Mark as Completed
     */
    public function buyerCancelReturn($id)
    {
        $order = Order::where('id', $id)
            ->where('user_id', Auth::id())
            ->where('status', 'Refund/Return')
            ->firstOrFail();

        if ($order->return_status === 'Approved') {
            return redirect()->back()->with('error', 'Cannot cancel an approved return.');
        }

        // Cancelling return means accepting the item -> Complete the transaction
        $order->update([
            'status' => 'Completed',
            'payment_status' => 'paid',
        ]);

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
            
            $order->update(['status' => 'Cancelled']);
        });

        return redirect()->back()->with('success', 'Order cancelled successfully. Stock has been restored.');
    }

    /**
     * BUYER: Download order receipt as printable HTML
     */
    public function downloadReceipt($id)
    {
        $order = Order::with('items')
            ->where('id', $id)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        return view('pdf.receipt', ['order' => $order]);
    }
}