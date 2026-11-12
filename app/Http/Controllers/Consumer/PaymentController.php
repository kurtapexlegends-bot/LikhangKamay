<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;

use App\Models\Order;
use App\Mail\PaymentReceiptMail;
use App\Services\OrderPaymentReconciliationService;
use App\Services\PayMongoService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class PaymentController extends Controller
{
    protected PayMongoService $payMongoService;
    protected OrderPaymentReconciliationService $reconciliationService;
    private const PAYABLE_ONLINE_STATUSES = ['Pending', 'Accepted', 'Processing', 'Ready for Pickup'];

    public function __construct(
        PayMongoService $payMongoService,
        OrderPaymentReconciliationService $reconciliationService
    ) {
        $this->payMongoService = $payMongoService;
        $this->reconciliationService = $reconciliationService;
    }

    /**
     * Initiate Payment for an Order
     */
    public function pay(Request $request, string $orderId)
    {
        $order = Order::where(function ($q) use ($orderId) {
                if (is_numeric($orderId)) {
                    $q->where('order_number', (string) $orderId)->orWhere('id', (int) $orderId);
                } else {
                    $q->where('order_number', (string) $orderId);
                }
            })
            ->where('user_id', Auth::id())
            ->firstOrFail();

        if (!\App\Facades\Settings::get('paymongo_enabled', true)) {
            return redirect()->back()->with('error', 'Online payments are currently disabled for maintenance. Please try again later or contact support.');
        }

        $targetRoute = $this->resolveOrderDashboardRoute($order);

        if ($order->payment_status === 'paid') {
            return redirect()->route($targetRoute)->with('success', 'Order is already paid.');
        }

        if (!$this->canInitiateOnlinePayment($order)) {
            return redirect()->route($targetRoute)->with('error', 'This order is not eligible for online payment.');
        }

        $order->loadMissing('items');
        [$lineItems, $calculatedTotal] = $this->buildCheckoutLineItems($order);

        if ((float) $order->total_amount < 20 || $calculatedTotal < 20) {
            return redirect()->back()->with('error', 'Payment failed: Minimum amount for online payment is PHP 20.00.');
        }

        if (round((float) $order->total_amount, 2) !== round((float) $calculatedTotal, 2)) {
            $order->update(['total_amount' => $calculatedTotal]);
        }

        $paymentMethodTypes = match ($order->payment_method) {
            'Maya' => ['paymaya'],
            'GCash' => ['gcash'],
            default => ['gcash', 'paymaya', 'card'],
        };

        $checkoutData = [
            'line_items' => $lineItems,
            'payment_method_types' => $paymentMethodTypes,
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

            if (in_array($order->status, [Order::STATUS_CANCELLED, Order::STATUS_REJECTED], true)) {
                return $this->redirectAfterPaymentResolution(
                    $order,
                    'error',
                    'This payment can no longer be applied to the order. Please contact support if you were charged.',
                    'This payment can no longer be applied automatically. Sign in and contact support if you were charged.'
                );
            }

            $reconciled = $this->reconciliationService->reconcileOrder($order, $session, force: true);

            if ($reconciled || $order->fresh()->payment_status === 'paid') {
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

    private function extractPaymentDetailsFromSession(array $session, string $orderId): array
    {
        $attributes = $session['attributes'] ?? [];
        $isPaid = ($attributes['payment_status'] ?? 'unpaid') === 'paid';
        $hasPaidPayment = false;
        $paymentId = null;
        $detectedMethod = null;

        $resolveMethodFromPayment = function ($payment) {
            $sourceType = $payment['attributes']['source']['type']
                ?? ($payment['source']['type']
                ?? ($payment['attributes']['payment_method_type'] ?? null));
            return match (strtolower((string) $sourceType)) {
                'paymaya', 'maya' => 'Maya',
                'gcash' => 'GCash',
                'card' => 'Card',
                'grab_pay' => 'GrabPay',
                default => null,
            };
        };

        foreach (($session['included'] ?? []) as $included) {
            $includedType = $included['type'] ?? null;
            $includedStatus = $included['attributes']['status'] ?? null;
            if ($includedType === 'payment' && $includedStatus === 'paid') {
                $hasPaidPayment = true;
                $paymentId = $included['id'] ?? null;
                $detectedMethod = $resolveMethodFromPayment($included);
                break;
            }
        }

        if (!$hasPaidPayment && !empty($attributes['payments']) && is_array($attributes['payments'])) {
            foreach ($attributes['payments'] as $payment) {
                $paymentStatus = $payment['status'] ?? ($payment['attributes']['status'] ?? null);
                if ($paymentStatus === 'paid') {
                    $hasPaidPayment = true;
                    $paymentId = $payment['id'] ?? ($payment['attributes']['id'] ?? null);
                    $detectedMethod = $resolveMethodFromPayment($payment);
                    break;
                }
            }
        }

        if (!$paymentId && !empty($attributes['payments']) && is_array($attributes['payments'])) {
            $firstPayment = reset($attributes['payments']);
            $paymentId = $firstPayment['id'] ?? ($firstPayment['attributes']['id'] ?? null);
            if (!$detectedMethod) {
                $detectedMethod = $resolveMethodFromPayment($firstPayment);
            }
        }

        $sessionStatus = $attributes['status'] ?? 'pending';

        \Illuminate\Support\Facades\Log::info('PayMongo Session Check', [
            'order' => $orderId,
            'payment_status' => $attributes['payment_status'] ?? 'unknown',
            'session_status' => $sessionStatus,
            'has_paid_payment' => $hasPaidPayment,
        ]);

        return [
            'isPaid' => $isPaid,
            'hasPaidPayment' => $hasPaidPayment,
            'paymentId' => $paymentId,
            'detectedMethod' => $detectedMethod,
        ];
    }

    private function finalizePaidOrder(Order $order, ?string $paymentId, ?string $detectedMethod): Order
    {
        $shouldSendReceipt = false;

        DB::transaction(function () use ($paymentId, $detectedMethod, &$order, &$shouldSendReceipt) {
            $lockedOrder = Order::where('id', $order->id)->lockForUpdate()->first();
            if (!$lockedOrder) {
                return;
            }

            $order = $lockedOrder;
            $wasUnpaid = $lockedOrder->payment_status !== 'paid';
            $updateData = [];

            if ($wasUnpaid) {
                $updateData['payment_status'] = 'paid';
                $updateData['payment_method'] = $detectedMethod ?: ($lockedOrder->payment_method ?: 'GCash');
                $shouldSendReceipt = true;
            } elseif ($detectedMethod && $lockedOrder->payment_method !== $detectedMethod) {
                $updateData['payment_method'] = $detectedMethod;
            }

            if ($paymentId && empty($lockedOrder->payment_id)) {
                $updateData['payment_id'] = $paymentId;
            }

            if (!empty($updateData)) {
                $lockedOrder->update($updateData);
            }
        });

        if ($shouldSendReceipt) {
            $this->sendPaymentReceipt($order->fresh());
        }

        return $order->fresh();
    }

    /**
     * Handle Cancelled Payment Redirect
     */
    public function cancel(Request $request)
    {
        $orderNumber = $request->query('order_id');
        $isB2B = false;
        if ($orderNumber) {
            $order = Order::where(function ($q) use ($orderNumber) {
                if (is_numeric($orderNumber)) {
                    $q->where('order_number', (string) $orderNumber)->orWhere('id', (int) $orderNumber);
                } else {
                    $q->where('order_number', (string) $orderNumber);
                }
            })->first();
            if ($order) {
                $isB2B = $this->resolveOrderDashboardRoute($order) === 'seller.supply-hub.orders';
            }
        }

        if (Auth::check()) {
            $targetRoute = $isB2B ? 'seller.supply-hub.orders' : 'my-orders.index';
            return redirect()->route($targetRoute)->with('error', 'Payment was cancelled.');
        }

        return redirect()->route('login')->with('error', 'Payment was cancelled. Sign in to continue with your order.');
    }

    /**
     * On-demand verification of an online payment order
     */
    public function verifyOnlinePayment(Request $request, string $orderNumber)
    {
        $user = Auth::user();
        $order = Order::where(function ($q) use ($orderNumber) {
            if (is_numeric($orderNumber)) {
                $q->where('order_number', (string) $orderNumber)->orWhere('id', (int) $orderNumber);
            } else {
                $q->where('order_number', (string) $orderNumber);
            }
        })->firstOrFail();

        $isBuyer = (int) $order->user_id === (int) $user->id;
        $isArtisan = (int) $order->artisan_id === (int) $user->id;
        $isAdmin = in_array($user->role, ['super_admin', 'admin'], true);

        if (!$isBuyer && !$isArtisan && !$isAdmin) {
            abort(403, 'Unauthorized.');
        }

        $this->reconciliationService->reconcileOrder($order, force: true);

        $order->refresh();
        $isPaid = $order->payment_status === 'paid';

        if ($request->wantsJson()) {
            return response()->json([
                'success' => true,
                'is_paid' => $isPaid,
                'payment_status' => $order->payment_status,
                'message' => $isPaid ? 'Payment verified successfully.' : 'Payment is still pending on PayMongo.',
            ]);
        }

        if ($isPaid) {
            return redirect()->back()->with('success', "Payment for Order #{$order->order_number} verified and marked as paid.");
        }

        return redirect()->back()->with('info', "Payment for Order #{$order->order_number} is still pending on PayMongo.");
    }

    private function canInitiateOnlinePayment(Order $order): bool
    {
        return in_array($order->payment_method, ['GCash', 'Maya'], true)
            && in_array($order->status, self::PAYABLE_ONLINE_STATUSES, true)
            && $order->payment_status === 'pending';
    }

    private function resolveOrderDashboardRoute(Order $order): string
    {
        $hasB2B = rescue(fn() => Schema::hasTable('order_items') && Schema::hasColumn('order_items', 'is_b2b_supply'), false);
        if (!$hasB2B) {
            return 'my-orders.index';
        }

        $isB2B = $order->relationLoaded('items')
            ? (bool) $order->items->contains('is_b2b_supply', true)
            : $order->items()->where('is_b2b_supply', DB::raw('true'))->exists();

        return $isB2B ? 'seller.supply-hub.orders' : 'my-orders.index';
    }

    private function redirectAfterPaymentResolution(Order $order, string $flashKey, string $ownerMessage, string $guestMessage)
    {
        if (Auth::id() === $order->user_id) {
            $targetRoute = $this->resolveOrderDashboardRoute($order);
            return redirect()->route($targetRoute)->with($flashKey, $ownerMessage);
        }

        if (!Auth::check()) {
            return redirect()->route('login')->with('status', $guestMessage);
        }

        return redirect('/')->with($flashKey, $guestMessage);
    }

    private function sendPaymentReceipt(Order $order): void
    {
        try {
            $order->loadMissing('user');
            $recipientEmail = $order->user?->email;

            if (!empty($recipientEmail)) {
                $mailer = \Illuminate\Support\Facades\Mail::to($recipientEmail);
                $mailable = new PaymentReceiptMail($order);

                if (app()->environment('production') && config('queue.default') !== 'sync') {
                    $mailer->queue($mailable);
                } else {
                    $mailer->send($mailable);
                }
            }
        } catch (\Throwable $e) {
            report($e);
            \Illuminate\Support\Facades\Log::error('Failed to send payment receipt email: ' . $e->getMessage(), [
                'order_id' => $order->id,
            ]);
        }
    }

    private function buildCheckoutLineItems(Order $order): array
    {
        $lineItems = [];
        $calculatedTotal = 0.0;
        $voucherDiscount = max(0.0, (float) ($order->voucher_discount_amount ?? 0));

        if ($voucherDiscount > 0) {
            $grossItemsCents = 0;
            foreach ($order->items as $item) {
                $grossItemsCents += (int) round(((float) $item->price) * 100) * (int) $item->quantity;
            }

            if ($grossItemsCents <= 0 && (float) $order->merchandise_subtotal > 0) {
                $grossItemsCents = (int) round(((float) $order->merchandise_subtotal) * 100);
            }

            $discountCents = (int) round($voucherDiscount * 100);
            $netMerchandiseCents = max(0, $grossItemsCents - $discountCents);

            if ($netMerchandiseCents > 0) {
                $firstItem = $order->items->first();
                if ($order->items->count() === 1 && $firstItem && (int) $firstItem->quantity === 1) {
                    $itemName = $firstItem->product_name . ($order->voucher_code ? " (Voucher {$order->voucher_code})" : ' (Discounted)');
                    $itemDesc = $firstItem->product_name . ' - Less shop voucher PHP ' . number_format($voucherDiscount, 2);
                } else {
                    $summaryNames = $order->items
                        ->map(fn ($it) => "{$it->quantity}x {$it->product_name}")
                        ->take(3)
                        ->implode(', ');
                    if ($order->items->count() > 3) {
                        $summaryNames .= ', ...';
                    }
                    $itemName = 'Order #' . $order->order_number . ' Items' . ($order->voucher_code ? " (Voucher {$order->voucher_code})" : '');
                    $itemDesc = ($summaryNames ?: 'Handcrafted items') . ' - Less shop voucher PHP ' . number_format($voucherDiscount, 2);
                }

                $lineItems[] = [
                    'currency' => 'PHP',
                    'amount' => $netMerchandiseCents,
                    'description' => $itemDesc,
                    'name' => $itemName,
                    'quantity' => 1,
                    'images' => [\App\Services\StorageUrl::url($firstItem?->product_img, asset('images/placeholder.svg'))],
                ];

                $calculatedTotal += round($netMerchandiseCents / 100, 2);
            }
        } else {
            foreach ($order->items as $item) {
                $lineItems[] = [
                    'currency' => 'PHP',
                    'amount' => (int) round($item->price * 100),
                    'description' => $item->product_name,
                    'name' => $item->product_name,
                    'quantity' => $item->quantity,
                    'images' => [\App\Services\StorageUrl::url($item->product_img, asset('images/placeholder.svg'))],
                ];

                $calculatedTotal += $item->price * $item->quantity;
            }
        }

        if ((float) $order->convenience_fee_amount > 0) {
            $lineItems[] = [
                'currency' => 'PHP',
                'amount' => (int) round(((float) $order->convenience_fee_amount) * 100),
                'description' => 'Delivery and order handling care',
                'name' => 'Delivery & Handling Care',
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

        return [$lineItems, round($calculatedTotal, 2)];
    }
}
