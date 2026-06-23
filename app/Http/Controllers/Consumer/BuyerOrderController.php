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
