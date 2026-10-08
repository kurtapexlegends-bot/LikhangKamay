<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use App\Models\Order;
use App\Models\SubscriptionTransaction;
use App\Services\SubscriptionService;

class PaymongoWebhookController extends Controller
{
    public function handle(Request $request)
    {
        if ($signatureResponse = $this->verifyWebhookSignature($request)) {
            return $signatureResponse;
        }

        $payload = $request->all();
        Log::info('PayMongo Webhook Received', ['payload' => $payload]);

        $eventType = $payload['data']['attributes']['type'] ?? null;
        $eventData = $payload['data']['attributes']['data'] ?? null;

        if (!$eventData) {
            return response()->json(['status' => 'ignored']);
        }

        return match ($eventType) {
            'checkout_session.payment.paid' => $this->handleCheckoutSessionPaid($eventData),
            'payment.paid' => $this->handlePaymentPaid($eventData),
            'payment.failed', 'checkout_session.payment.failed' => $this->handlePaymentFailed($eventData),
            default => response()->json(['status' => 'ignored']),
        };
    }

    private function verifyWebhookSignature(Request $request): ?\Illuminate\Http\JsonResponse
    {
        $signatureHeader = $request->header('Paymongo-Signature');
        $webhookSecret = config('services.paymongo.webhook_secret');

        if (app()->environment('production') || !empty($webhookSecret)) {
            if (!$signatureHeader) {
                Log::warning('PayMongo Webhook: Missing signature header');
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            if (!$webhookSecret) {
                Log::error('PayMongo Webhook: Webhook secret key is missing in config');
                return response()->json(['message' => 'Internal Server Error'], 500);
            }

            $parts = explode(',', $signatureHeader);
            $timestamp = null;
            $signature = null;

            foreach ($parts as $part) {
                $subParts = explode('=', $part, 2);
                if (count($subParts) === 2) {
                    $key = trim($subParts[0]);
                    $val = trim($subParts[1]);
                    if ($key === 't') {
                        $timestamp = $val;
                    } elseif ($key === 'v1') {
                        $signature = $val;
                    }
                }
            }

            if (!$timestamp || !$signature) {
                Log::warning('PayMongo Webhook: Invalid signature header format', ['header' => $signatureHeader]);
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            if (abs(time() - (int) $timestamp) > 300) {
                Log::warning('PayMongo Webhook: Timestamp difference too large', ['timestamp' => $timestamp]);
                return response()->json(['message' => 'Unauthorized'], 401);
            }

            $payload = $request->getContent();
            $signedPayload = $timestamp . '.' . $payload;
            $expectedSignature = hash_hmac('sha256', $signedPayload, $webhookSecret);

            if (!hash_equals($expectedSignature, $signature)) {
                Log::warning('PayMongo Webhook: Signature mismatch', [
                    'expected' => $expectedSignature,
                    'received' => $signature,
                ]);
                return response()->json(['message' => 'Unauthorized'], 401);
            }
        }

        return null;
    }

    private function handleCheckoutSessionPaid(array $sessionData): \Illuminate\Http\JsonResponse
    {
        $sessionId = $sessionData['id'] ?? null;
        $status = $sessionData['attributes']['payment_status'] ?? ($sessionData['attributes']['status'] ?? null);

        if ($sessionId && $status === 'paid') {
            $paymentId = null;
            $detectedMethod = null;
            $payments = $sessionData['attributes']['payments'] ?? [];
            if (is_array($payments) && !empty($payments)) {
                $firstPayment = reset($payments);
                $paymentId = $firstPayment['id'] ?? ($firstPayment['attributes']['id'] ?? null);
                $sourceType = $firstPayment['attributes']['source']['type']
                    ?? ($firstPayment['source']['type']
                    ?? ($firstPayment['attributes']['payment_method_type'] ?? null));
                $detectedMethod = match (strtolower((string) $sourceType)) {
                    'paymaya', 'maya' => 'Maya',
                    'gcash' => 'GCash',
                    'card' => 'Card',
                    'grab_pay' => 'GrabPay',
                    default => null,
                };
            }
            if (!$paymentId && !empty($sessionData['relationships']['payments']['data'])) {
                $relPayments = $sessionData['relationships']['payments']['data'];
                if (is_array($relPayments)) {
                    $firstRel = reset($relPayments);
                    $paymentId = $firstRel['id'] ?? null;
                }
            }

            // Check if it's one or more Orders
            $orderIds = Order::where('paymongo_session_id', $sessionId)->pluck('id');
            if ($orderIds->isNotEmpty()) {
                $receiptOrders = [];
                \Illuminate\Support\Facades\DB::transaction(function () use ($orderIds, $paymentId, $detectedMethod, &$receiptOrders) {
                    $lockedOrders = Order::whereIn('id', $orderIds)->lockForUpdate()->get();
                    foreach ($lockedOrders as $order) {
                        $wasUnpaid = $order->payment_status !== 'paid';
                        if ($wasUnpaid || ($paymentId && empty($order->payment_id)) || ($detectedMethod && $order->payment_method !== $detectedMethod)) {
                            $updateData = ['payment_status' => 'paid'];
                            if ($detectedMethod) {
                                $updateData['payment_method'] = $detectedMethod;
                            }
                            if ($paymentId && empty($order->payment_id)) {
                                $updateData['payment_id'] = $paymentId;
                            }
                            $order->update($updateData);
                            Log::info('Order marked as paid via Webhook', [
                                'order_id' => $order->id,
                                'order_number' => $order->order_number,
                                'payment_id' => $paymentId,
                                'payment_method' => $order->payment_method,
                            ]);

                            if ($wasUnpaid) {
                                $receiptOrders[] = $order;
                            }
                        }
                    }
                });

                foreach ($receiptOrders as $receiptOrder) {
                    $this->sendPaymentReceipt($receiptOrder->fresh());
                }

                return response()->json(['status' => 'success']);
            }

            // Check if it's a SubscriptionTransaction
            $ref = $sessionData['attributes']['metadata']['reference_number'] ?? null;
            $transaction = SubscriptionTransaction::query()
                ->where(function ($q) use ($sessionId, $ref) {
                    if ($sessionId) {
                        $q->where('paymongo_session_id', $sessionId);
                    }
                    if ($ref) {
                        $sessionId ? $q->orWhere('reference_number', $ref) : $q->where('reference_number', $ref);
                    }
                })
                ->first();

            if ($transaction) {
                if ($transaction->status !== SubscriptionTransaction::STATUS_PAID) {
                    app(SubscriptionService::class)->activateSubscription($transaction, $sessionData);
                    Log::info('Subscription marked as paid via Webhook', ['transaction_id' => $transaction->id]);
                }
                return response()->json(['status' => 'success']);
            }
        }

        return response()->json(['status' => 'ignored']);
    }

    private function handlePaymentPaid(array $paymentData): \Illuminate\Http\JsonResponse
    {
        $sessionId = $paymentData['attributes']['checkout_session_id'] ?? null;
        $ref = $paymentData['attributes']['metadata']['reference_number'] ?? ($paymentData['attributes']['description'] ?? null);

        $transaction = SubscriptionTransaction::query()
            ->where(function ($q) use ($sessionId, $ref) {
                if ($sessionId) {
                    $q->where('paymongo_session_id', $sessionId);
                }
                if ($ref) {
                    $sessionId ? $q->orWhere('reference_number', $ref) : $q->where('reference_number', $ref);
                }
            })
            ->first();

        if ($transaction) {
            if ($transaction->status !== SubscriptionTransaction::STATUS_PAID) {
                app(SubscriptionService::class)->activateSubscription($transaction, $paymentData);
                Log::info('Subscription renewed/paid via payment.paid Webhook', ['transaction_id' => $transaction->id]);
            }
            return response()->json(['status' => 'success']);
        }

        return response()->json(['status' => 'ignored']);
    }

    private function handlePaymentFailed(array $failureData): \Illuminate\Http\JsonResponse
    {
        $sessionId = $failureData['id'] ?? ($failureData['attributes']['checkout_session_id'] ?? null);
        $ref = $failureData['attributes']['reference_number'] ?? ($failureData['attributes']['metadata']['reference_number'] ?? null);

        $transaction = SubscriptionTransaction::query()
            ->where(function ($q) use ($sessionId, $ref) {
                if ($sessionId) {
                    $q->where('paymongo_session_id', $sessionId);
                }
                if ($ref) {
                    $sessionId ? $q->orWhere('reference_number', $ref) : $q->where('reference_number', $ref);
                }
            })
            ->first();

        if ($transaction) {
            if ($transaction->status !== SubscriptionTransaction::STATUS_PAID) {
                app(SubscriptionService::class)->failSubscription($transaction, $failureData);
                Log::warning('Subscription marked as failed via Webhook', ['transaction_id' => $transaction->id]);
            }
            return response()->json(['status' => 'success']);
        }

        return response()->json(['status' => 'ignored']);
    }

    private function sendPaymentReceipt(Order $order): void
    {
        try {
            $order->loadMissing('user');
            $recipientEmail = $order->user?->email;

            if (!empty($recipientEmail)) {
                $mailer = \Illuminate\Support\Facades\Mail::to($recipientEmail);
                $mailable = new \App\Mail\PaymentReceiptMail($order);

                if (app()->environment('production') && config('queue.default') !== 'sync') {
                    $mailer->queue($mailable);
                } else {
                    $mailer->send($mailable);
                }
            }
        } catch (\Throwable $e) {
            report($e);
            Log::error('Failed to send payment receipt email: ' . $e->getMessage(), [
                'order_id' => $order->id,
            ]);
        }
    }
}
