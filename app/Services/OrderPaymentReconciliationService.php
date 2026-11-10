<?php

namespace App\Services;

use App\Mail\PaymentReceiptMail;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class OrderPaymentReconciliationService
{
    public const RECONCILE_CACHE_TTL_SECONDS = 30;

    protected PayMongoService $payMongoService;

    public function __construct(PayMongoService $payMongoService)
    {
        $this->payMongoService = $payMongoService;
    }

    /**
     * Reconcile a single order against PayMongo
     */
    public function reconcileOrder(Order $order, ?array $sessionData = null, bool $force = false): bool
    {
        if ($order->payment_status === 'paid') {
            return true;
        }

        if (!in_array($order->payment_method, ['GCash', 'Maya'], true)) {
            return false;
        }

        $sessionId = $order->paymongo_session_id;
        if (empty($sessionId) && empty($sessionData)) {
            return false;
        }

        $cacheKey = "paymongo_reconcile_{$order->id}_{$sessionId}";
        if (!$force && empty($sessionData) && Cache::has($cacheKey)) {
            return false;
        }

        if (!$force && empty($sessionData)) {
            Cache::put($cacheKey, true, now()->addSeconds(self::RECONCILE_CACHE_TTL_SECONDS));
        }

        try {
            $session = $sessionData ?: $this->payMongoService->retrieveCheckoutSession($sessionId);
            $paymentDetails = $this->extractPaymentDetailsFromSession($session, $order->order_number);

            if ($paymentDetails['isPaid'] || $paymentDetails['hasPaidPayment']) {
                $this->finalizePaidOrder($order, $paymentDetails['paymentId'], $paymentDetails['detectedMethod'], $sessionId);
                Cache::forget($cacheKey);
                return true;
            }
        } catch (\Throwable $e) {
            Log::warning('OrderPaymentReconciliationService: Failed to retrieve/reconcile session', [
                'order_id' => $order->id,
                'order_number' => $order->order_number,
                'session_id' => $sessionId,
                'error' => $e->getMessage(),
            ]);
        }

        return false;
    }

    /**
     * Reconcile pending online orders for a buyer
     */
    public function reconcilePendingOrdersForBuyer(User $buyer): int
    {
        $reconciledCount = 0;

        Order::query()
            ->where('user_id', $buyer->id)
            ->whereIn('payment_method', ['GCash', 'Maya'])
            ->where('payment_status', 'pending')
            ->whereNotNull('paymongo_session_id')
            ->whereNotIn('status', [Order::STATUS_CANCELLED, Order::STATUS_REJECTED])
            ->latest()
            ->limit(10)
            ->get()
            ->each(function (Order $order) use (&$reconciledCount) {
                if ($this->reconcileOrder($order)) {
                    $reconciledCount++;
                }
            });

        return $reconciledCount;
    }

    /**
     * Reconcile pending online orders for a seller
     */
    public function reconcilePendingOrdersForSeller(int $sellerId): int
    {
        $reconciledCount = 0;

        Order::query()
            ->where('artisan_id', $sellerId)
            ->whereIn('payment_method', ['GCash', 'Maya'])
            ->where('payment_status', 'pending')
            ->whereNotNull('paymongo_session_id')
            ->whereNotIn('status', [Order::STATUS_CANCELLED, Order::STATUS_REJECTED])
            ->latest()
            ->limit(10)
            ->get()
            ->each(function (Order $order) use (&$reconciledCount) {
                if ($this->reconcileOrder($order)) {
                    $reconciledCount++;
                }
            });

        return $reconciledCount;
    }

    /**
     * Handle PayMongo checkout_session.payment.paid webhook payload
     */
    public function handleWebhookSession(array $sessionData): ?Order
    {
        $sessionId = $sessionData['id'] ?? null;
        $ref = $sessionData['attributes']['reference_number']
            ?? ($sessionData['attributes']['metadata']['reference_number']
            ?? ($sessionData['attributes']['metadata']['order_number'] ?? null));

        if (!$sessionId && !$ref) {
            return null;
        }

        $orders = Order::query()
            ->where(function ($q) use ($sessionId, $ref) {
                if ($sessionId) {
                    $q->where('paymongo_session_id', $sessionId);
                }
                if ($ref) {
                    $sessionId ? $q->orWhere('order_number', $ref) : $q->where('order_number', $ref);
                }
            })
            ->get();

        if ($orders->isEmpty()) {
            return null;
        }

        foreach ($orders as $order) {
            if (empty($order->paymongo_session_id) && $sessionId) {
                $order->update(['paymongo_session_id' => $sessionId]);
            }

            $this->reconcileOrder($order, $sessionData, force: true);
        }

        return $orders->first()?->fresh();
    }

    /**
     * Handle PayMongo payment.paid webhook payload
     */
    public function handleWebhookPayment(array $paymentData): ?Order
    {
        $sessionId = $paymentData['attributes']['checkout_session_id'] ?? null;
        $ref = $paymentData['attributes']['metadata']['reference_number']
            ?? ($paymentData['attributes']['metadata']['order_number']
            ?? ($paymentData['attributes']['description'] ?? null));

        // Attempt to extract order number if formatted like "Payment for Order #ORD-..."
        if ($ref && preg_match('/(ORD-[A-Z0-9]+)/i', $ref, $matches)) {
            $ref = $matches[1];
        }

        if (!$sessionId && !$ref) {
            return null;
        }

        $orders = Order::query()
            ->where(function ($q) use ($sessionId, $ref) {
                if ($sessionId) {
                    $q->where('paymongo_session_id', $sessionId);
                }
                if ($ref) {
                    $sessionId ? $q->orWhere('order_number', $ref) : $q->where('order_number', $ref);
                }
            })
            ->get();

        if ($orders->isEmpty()) {
            return null;
        }

        $paymentId = $paymentData['id'] ?? null;
        $sourceType = $paymentData['attributes']['source']['type']
            ?? ($paymentData['source']['type']
            ?? ($paymentData['attributes']['payment_method_type'] ?? null));

        $detectedMethod = match (strtolower((string) $sourceType)) {
            'paymaya', 'maya' => 'Maya',
            'gcash' => 'GCash',
            'card' => 'Card',
            'grab_pay' => 'GrabPay',
            default => null,
        };

        foreach ($orders as $order) {
            $this->finalizePaidOrder($order, $paymentId, $detectedMethod, $sessionId);
        }

        return $orders->first()?->fresh();
    }

    /**
     * Extract payment details from PayMongo session payload
     */
    public function extractPaymentDetailsFromSession(array $session, ?string $expectedOrderNumber = null): array
    {
        $attributes = $session['attributes'] ?? [];
        $isPaid = ($attributes['payment_status'] ?? 'unpaid') === 'paid'
            || ($attributes['status'] ?? 'pending') === 'paid';

        $hasPaidPayment = false;
        $paymentId = null;
        $detectedMethod = null;

        $resolveMethod = function ($payment) {
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

        // Check included resources
        foreach (($session['included'] ?? []) as $included) {
            $type = $included['type'] ?? null;
            $status = $included['attributes']['status'] ?? null;
            if ($type === 'payment' && $status === 'paid') {
                $hasPaidPayment = true;
                $paymentId = $included['id'] ?? null;
                $detectedMethod = $resolveMethod($included);
                break;
            }
        }

        // Check payments attribute list
        if (!$hasPaidPayment && !empty($attributes['payments']) && is_array($attributes['payments'])) {
            foreach ($attributes['payments'] as $payment) {
                $status = $payment['status'] ?? ($payment['attributes']['status'] ?? null);
                if ($status === 'paid') {
                    $hasPaidPayment = true;
                    $paymentId = $payment['id'] ?? ($payment['attributes']['id'] ?? null);
                    $detectedMethod = $resolveMethod($payment);
                    break;
                }
            }
        }

        if (!$paymentId && !empty($attributes['payments']) && is_array($attributes['payments'])) {
            $firstPayment = reset($attributes['payments']);
            $paymentId = $firstPayment['id'] ?? ($firstPayment['attributes']['id'] ?? null);
            if (!$detectedMethod) {
                $detectedMethod = $resolveMethod($firstPayment);
            }
        }

        return [
            'isPaid' => $isPaid,
            'hasPaidPayment' => $hasPaidPayment,
            'paymentId' => $paymentId,
            'detectedMethod' => $detectedMethod,
        ];
    }

    /**
     * Atomically mark order as paid with lock and receipt email
     */
    protected function finalizePaidOrder(Order $order, ?string $paymentId, ?string $detectedMethod, ?string $sessionId = null): Order
    {
        $shouldSendReceipt = false;

        DB::transaction(function () use ($paymentId, $detectedMethod, $sessionId, &$order, &$shouldSendReceipt) {
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

            if ($sessionId && empty($lockedOrder->paymongo_session_id)) {
                $updateData['paymongo_session_id'] = $sessionId;
            }

            $isCancelled = in_array($lockedOrder->status, [Order::STATUS_CANCELLED, Order::STATUS_REJECTED], true)
                || strcasecmp((string) $lockedOrder->status, Order::STATUS_CANCELLED) === 0;

            if ($isCancelled && $wasUnpaid) {
                $reconciliationNote = '[PAID_AFTER_CANCELLATION] Payment confirmed post-cancellation. Flagged for admin/artisan review & customer refund.';
                $updateData['cancellation_reason'] = $lockedOrder->cancellation_reason
                    ? ($lockedOrder->cancellation_reason . ' | ' . $reconciliationNote)
                    : $reconciliationNote;
            }

            if (!empty($updateData)) {
                $lockedOrder->update($updateData);
                Log::info('Order finalized as paid', [
                    'order_id' => $lockedOrder->id,
                    'order_number' => $lockedOrder->order_number,
                    'payment_id' => $paymentId,
                    'payment_method' => $updateData['payment_method'] ?? $lockedOrder->payment_method,
                    'status' => $lockedOrder->status,
                ]);
            }
        });

        if ($shouldSendReceipt) {
            rescue(fn () => $this->sendPaymentReceipt($order->fresh()), report: false);
        }

        return $order->fresh();
    }

    /**
     * Send payment receipt email
     */
    public function sendPaymentReceipt(Order $order): void
    {
        try {
            $order->loadMissing('user');
            $recipientEmail = $order->user?->email;

            if (!empty($recipientEmail)) {
                $mailer = Mail::to($recipientEmail);
                $mailable = new PaymentReceiptMail($order);

                if (app()->environment('production') && config('queue.default') !== 'sync') {
                    $mailer->queue($mailable);
                } else {
                    $mailer->send($mailable);
                }
            }
        } catch (\Throwable $e) {
            report($e);
            Log::error('OrderPaymentReconciliationService: Failed to send payment receipt: ' . $e->getMessage(), [
                'order_id' => $order->id,
            ]);
        }
    }
}
