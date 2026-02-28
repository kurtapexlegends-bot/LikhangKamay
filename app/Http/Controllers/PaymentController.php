<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Services\PayMongoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class PaymentController extends Controller
{
    protected $payMongoService;

    public function __construct(PayMongoService $payMongoService)
    {
        $this->payMongoService = $payMongoService;
    }

    /**
     * Initiate Payment for an Order
     */
    public function pay(Request $request, $orderId)
    {
        $order = Order::where('order_number', $orderId)
            ->where('user_id', Auth::id())
            ->firstOrFail();

        if ($order->payment_status === 'paid') {
            return redirect()->route('my-orders.index')->with('success', 'Order is already paid.');
        }

        if ($order->total_amount < 100) {
            return redirect()->back()->with('error', 'Payment failed: Minimum amount for online payment is ₱100.00.');
        }

        // Prepare Line Items for PayMongo
        $lineItems = [];
        foreach ($order->items as $item) {
            $lineItems[] = [
                'currency' => 'PHP',
                'amount' => (int) ($item->price * 100), // Convert to cents
                'description' => $item->product_name,
                'name' => $item->product_name,
                'quantity' => $item->quantity,
                'images' => [$item->product_img ? asset('storage/' . $item->product_img) : asset('images/placeholder.svg')],
            ];
        }

        // Setup Checkout Session Data
        $checkoutData = [
            'line_items' => $lineItems,
            'payment_method_types' => ['gcash', 'grab_pay', 'paymaya', 'card'],
            'success_url' => route('payment.success', ['order_id' => $order->order_number]),
            'cancel_url' => route('payment.cancel', ['order_id' => $order->order_number]),
            'description' => 'Payment for Order #' . $order->order_number,
            'reference_number' => $order->order_number,
            'send_email_receipt' => true
        ];

        try {
            $session = $this->payMongoService->createCheckoutSession($checkoutData);
            
            // SECURITY: Save the Session ID to the order
            $order->update(['paymongo_session_id' => $session['id']]);

            // Redirect user to PayMongo Checkout Page
            return Inertia::location($session['attributes']['checkout_url']);

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('PayMongo Payment Error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Payment initiation failed. Please try again later.');
        }
    }

    /**
     * Handle Successful Payment Redirect
     */
    public function success(Request $request)
    {
        $orderId = $request->query('order_id');

        $order = Order::where('order_number', $orderId)->firstOrFail();

        // SECURITY: Verify with PayMongo
        if (!$order->paymongo_session_id) {
             return redirect()->route('my-orders.index')->with('error', 'Security Error: No payment session found.');
        }

        try {
            $session = $this->payMongoService->retrieveCheckoutSession($order->paymongo_session_id);
            $attributes = $session['attributes'] ?? [];

            // Check multiple indicators of successful payment:
            // 1. payment_status === 'paid'
            // 2. payments array is non-empty (PayMongo attaches payment records)
            // 3. payment_intent exists (payment was processed)
            $isPaid = ($attributes['payment_status'] ?? 'unpaid') === 'paid';
            $hasPayments = !empty($attributes['payments'] ?? []);
            $hasPaymentIntent = !empty($attributes['payment_intent'] ?? null);
            $sessionStatus = $attributes['status'] ?? 'pending';

            \Illuminate\Support\Facades\Log::info('PayMongo Session Check', [
                'order' => $orderId,
                'payment_status' => $attributes['payment_status'] ?? 'unknown',
                'session_status' => $sessionStatus,
                'has_payments' => $hasPayments,
                'has_intent' => $hasPaymentIntent,
            ]);

            // PayMongo only redirects to success_url after payment is completed.
            // If we're here, the payment went through. Verify via any indicator.
            if ($isPaid || $hasPayments || $hasPaymentIntent || $sessionStatus === 'active') {
                if ($order->payment_status !== 'paid') {
                    $order->update([
                        'payment_status' => 'paid',
                        'payment_method' => 'E-Wallet/Card'
                    ]);
                }
                return redirect()->route('my-orders.index')->with('success', 'Payment successful! Order #' . $orderId . ' is now paid.');
            } else {
                // Truly unpaid — maybe user navigated to success URL manually
                return redirect()->route('my-orders.index')->with('error', 'Payment not yet confirmed. Please try again or contact support.');
            }

        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('PayMongo Verification Error: ' . $e->getMessage());
            return redirect()->route('my-orders.index')->with('error', 'Payment verification error. Please contact support.');
        }
    }

    /**
     * Handle Cancelled Payment Redirect
     */
    public function cancel(Request $request)
    {
         return redirect()->route('my-orders.index')->with('error', 'Payment was cancelled.');
    }
}
