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
    private const PAYABLE_ONLINE_STATUSES = ['Pending', 'Accepted'];

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

        if (!$this->canInitiateOnlinePayment($order)) {
            return redirect()->route('my-orders.index')->with('error', 'This order is not eligible for online payment.');
        }

        if ($order->total_amount < 100) {
            return redirect()->back()->with('error', 'Payment failed: Minimum amount for online payment is PHP 100.00.');
        }

        $lineItems = [];
        $calculatedTotal = 0;

        foreach ($order->items as $item) {
            $lineItems[] = [
                'currency' => 'PHP',
                'amount' => (int) round($item->price * 100),
                'description' => $item->product_name,
                'name' => $item->product_name,
                'quantity' => $item->quantity,
                'images' => [$item->product_img ? asset('storage/' . $item->product_img) : asset('images/placeholder.svg')],
            ];

            $calculatedTotal += $item->price * $item->quantity;
        }

        if ((float) $order->convenience_fee_amount > 0) {
            $lineItems[] = [
                'currency' => 'PHP',
                'amount' => (int) round(((float) $order->convenience_fee_amount) * 100),
                'description' => 'Convenience fee (3%) for delivery order',
                'name' => 'Convenience Fee (3%)',
                'quantity' => 1,
            ];

            $calculatedTotal += (float) $order->convenience_fee_amount;
        }

        $shippingFeeAmount = $order->getResolvedShippingFeeAmount();

        if ($shippingFeeAmount > 0) {
            $lineItems[] = [
                'currency' => 'PHP',
                'amount' => (int) round($shippingFeeAmount * 100),
                'description' => 'Estimated delivery fee for this order',
                'name' => 'Shipping Fee',
                'quantity' => 1,
            ];

            $calculatedTotal += $shippingFeeAmount;
        }

        if ((float) $order->total_amount !== (float) $calculatedTotal) {
            $order->update(['total_amount' => $calculatedTotal]);
        }

        $checkoutData = [
            'line_items' => $lineItems,
            'payment_method_types' => ['gcash', 'grab_pay', 'paymaya', 'card'],
            'success_url' => route('payment.success', ['order_id' => $order->order_number]),
            'cancel_url' => route('payment.cancel', ['order_id' => $order->order_number]),
            'description' => 'Payment for Order #' . $order->order_number,
            'reference_number' => $order->order_number,
            'send_email_receipt' => true,
        ];

        try {
            $session = $this->payMongoService->createCheckoutSession($checkoutData);

            $order->update(['paymongo_session_id' => $session['id']]);

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

        if ($order->payment_status === 'paid') {
            return $this->redirectAfterPaymentResolution(
                $order,
                'success',
                'Payment successful! Order #' . $orderId . ' is now paid.',
                'Payment was already verified. Sign in to view your updated order.'
            );
        }

        if (!$order->paymongo_session_id) {
            return $this->redirectAfterPaymentResolution(
                $order,
                'error',
                'Security Error: No payment session found.',
                'Payment verification could not be completed from this link. Sign in and try again.'
            );
        }

        try {
            $session = $this->payMongoService->retrieveCheckoutSession($order->paymongo_session_id);
            $attributes = $session['attributes'] ?? [];
            $referenceNumber = $attributes['reference_number'] ?? null;

            if ($referenceNumber && $referenceNumber !== $order->order_number) {
                \Illuminate\Support\Facades\Log::warning('PayMongo reference mismatch', [
                    'order' => $order->order_number,
                    'reference_number' => $referenceNumber,
                    'session_id' => $order->paymongo_session_id,
                ]);

                return $this->redirectAfterPaymentResolution(
                    $order,
                    'error',
                    'Payment verification failed. Please contact support.',
                    'Payment verification failed from this link. Sign in and contact support if you were charged.'
                );
            }

            $isPaid = ($attributes['payment_status'] ?? 'unpaid') === 'paid';
            $hasPaidPayment = false;

            foreach (($session['included'] ?? []) as $included) {
                $includedType = $included['type'] ?? null;
                $includedStatus = $included['attributes']['status'] ?? null;
                if ($includedType === 'payment' && $includedStatus === 'paid') {
                    $hasPaidPayment = true;
                    break;
                }
            }

            if (!$hasPaidPayment && !empty($attributes['payments']) && is_array($attributes['payments'])) {
                foreach ($attributes['payments'] as $payment) {
                    $paymentStatus = $payment['status'] ?? ($payment['attributes']['status'] ?? null);
                    if ($paymentStatus === 'paid') {
                        $hasPaidPayment = true;
                        break;
                    }
                }
            }

            $sessionStatus = $attributes['status'] ?? 'pending';

            \Illuminate\Support\Facades\Log::info('PayMongo Session Check', [
                'order' => $orderId,
                'payment_status' => $attributes['payment_status'] ?? 'unknown',
                'session_status' => $sessionStatus,
                'has_paid_payment' => $hasPaidPayment,
            ]);

            if (!$this->canInitiateOnlinePayment($order)) {
                return $this->redirectAfterPaymentResolution(
                    $order,
                    'error',
                    'This payment can no longer be applied to the order. Please contact support if you were charged.',
                    'This payment can no longer be applied automatically. Sign in and contact support if you were charged.'
                );
            }

            if ($isPaid || $hasPaidPayment) {
                $updateData = [];
                if ($order->payment_status !== 'paid') {
                    $updateData['payment_status'] = 'paid';
                    $updateData['payment_method'] = $order->payment_method ?: 'GCash';
                }

                if ($order->paymongo_session_id) {
                    $updateData['paymongo_session_id'] = null;
                }

                if (!empty($updateData)) {
                    $order->update($updateData);
                }

                return $this->redirectAfterPaymentResolution(
                    $order->fresh(),
                    'success',
                    'Payment successful! Order #' . $orderId . ' is now paid.',
                    'Payment verified successfully. Sign in to view your updated order.'
                );
            }

            return $this->redirectAfterPaymentResolution(
                $order,
                'error',
                'Payment not yet confirmed. Please try again or contact support.',
                'Payment is not yet confirmed. Sign in later to check your order status.'
            );
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('PayMongo Verification Error: ' . $e->getMessage());

            return $this->redirectAfterPaymentResolution(
                $order,
                'error',
                'Payment verification error. Please contact support.',
                'Payment verification failed. Sign in and contact support if you were charged.'
            );
        }
    }

    /**
     * Handle Cancelled Payment Redirect
     */
    public function cancel(Request $request)
    {
        if (Auth::check()) {
            return redirect()->route('my-orders.index')->with('error', 'Payment was cancelled.');
        }

        return redirect()->route('login')->with('status', 'Payment was cancelled. Sign in to continue with your order.');
    }

    private function canInitiateOnlinePayment(Order $order): bool
    {
        return $order->payment_method === 'GCash'
            && in_array($order->status, self::PAYABLE_ONLINE_STATUSES, true)
            && $order->payment_status === 'pending';
    }

    private function redirectAfterPaymentResolution(Order $order, string $flashKey, string $ownerMessage, string $guestMessage)
    {
        if (Auth::id() === $order->user_id) {
            return redirect()->route('my-orders.index')->with($flashKey, $ownerMessage);
        }

        if (!Auth::check()) {
            return redirect()->route('login')->with('status', $guestMessage);
        }

        return redirect('/')->with($flashKey, $guestMessage);
    }
}
