<?php

declare(strict_types=1);

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\User;
use App\Http\Requests\CheckoutRequest;
use App\Http\Requests\Consumer\QuoteShippingRequest;
use App\Http\Requests\Consumer\RequestReturnRequest;
use App\Services\OrderFinanceService;
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
use Inertia\Inertia;

class BuyerOrderController extends Controller
{
    /**
     * BUYER: Checkout page - prepare order
     */
    public function create(Request $request, PrepareCheckout $prepareCheckout)
    {
        if (Auth::check() && in_array(Auth::user()->role, ['super_admin', 'admin'], true)) {
            abort(403, 'Administrators are not permitted to make purchases.');
        }

        if (Auth::check() && Auth::user()->isSuspended()) {
            $days = Auth::user()->daysRemainingSuspension();
            $reason = Auth::user()->suspension_reason ?: 'Policy violation';
            abort(403, "Your account is temporarily suspended for {$days} day(s) until " . Auth::user()->suspended_until->format('M d, Y') . ". Reason: {$reason}. You cannot place new orders at this time.");
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
    public function quoteShipping(QuoteShippingRequest $request, QuoteCheckoutShipping $quoteCheckoutShipping)
    {
        if (Auth::check() && in_array(Auth::user()->role, ['super_admin', 'admin'], true)) {
            abort(403, 'Administrators are not permitted to make purchases.');
        }

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

        if (Auth::check() && Auth::user()->isSuspended()) {
            $days = Auth::user()->daysRemainingSuspension();
            $reason = Auth::user()->suspension_reason ?: 'Policy violation';
            abort(403, "Your account is temporarily suspended for {$days} day(s) until " . Auth::user()->suspended_until->format('M d, Y') . ". Reason: {$reason}. You cannot place new orders at this time.");
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
    public function buyerRequestReturn(RequestReturnRequest $request, string $id, RequestOrderReturn $requestOrderReturn)
    {
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
     * BUYER: Cancel pending/accepted order
     */
    public function buyerCancelOrder(Request $request, string $id, CancelOrder $cancelOrder)
    {
        $validated = $request->validate([
            'reason' => 'nullable|string|max:100',
            'details' => 'nullable|string|max:500',
        ]);

        try {
            $reason = $validated['reason'] ?? 'buyer_cancelled';
            $details = $validated['details'] ?? null;
            $cancelOrder->execute($id, Auth::user(), $reason, $details);
            return redirect()->back()->with('success', 'Order cancelled successfully.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * BUYER: 1-Click Change Address & Re-Order
     */
    public function changeAddressAndReorder(string $id, CancelOrder $cancelOrder)
    {
        /** @var \App\Models\User $buyer */
        $buyer = Auth::user();

        $order = Order::with('items')->where('id', $id)
            ->where('user_id', $buyer->id)
            ->firstOrFail();

        $isPending = $order->status === 'Pending';
        $isWithinGracePeriod = $order->status === 'Accepted'
            && $order->accepted_at !== null
            && $order->accepted_at->greaterThanOrEqualTo(now()->subMinutes(15));

        if (!$isPending && !$isWithinGracePeriod) {
            return redirect()->back()->with('error', 'Orders can only be modified while pending or within 15 minutes of acceptance before processing begins.');
        }

        try {
            // 1. Atomically cancel previous order and restore stock / refund
            $cancelOrder->execute($id, $buyer, 'change_delivery_address', 'Buyer initiated 1-click address change re-order');

            // 2. Repopulate session cart with exact items & quantities
            $productIds = $order->items->pluck('product_id')->filter()->unique()->all();
            $products = \App\Models\Product::with('user')->whereIn('id', $productIds)->get()->keyBy('id');

            $cart = [];
            foreach ($order->items as $item) {
                $product = $products->get($item->product_id);
                if (!$product) {
                    continue;
                }

                $variant = trim((string) ($item->variant ?? 'Standard')) ?: 'Standard';
                $cartKey = $product->id . ':' . md5(strtolower($variant));

                $cart[$cartKey] = [
                    'id' => $product->id,
                    'cart_key' => $cartKey,
                    'artisan_id' => $product->artisan_id ?? $product->user_id,
                    'name' => $product->name,
                    'variant' => $variant,
                    'sku' => $product->sku,
                    'slug' => $product->slug,
                    'price' => $product->effective_price,
                    'original_price' => (float) $product->price,
                    'discount_info' => $product->discount_info,
                    'qty' => $item->quantity,
                    'img' => $product->img,
                    'seller' => $product->user->shop_name ?? $product->user->name ?? 'Shop',
                    'shop_name' => $product->user->shop_name ?? $product->user->name ?? 'Shop',
                    'location' => $product->user->city ?? 'Cavite',
                ];
            }

            \Illuminate\Support\Facades\Session::put('cart', $cart);

            return redirect()->route('checkout.create')->with('info', 'Previous order was cancelled. Please select or add your new delivery address below.');
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
}
