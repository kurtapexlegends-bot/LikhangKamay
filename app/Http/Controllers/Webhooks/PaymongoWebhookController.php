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

        $payload = $request->all();

        Log::info('PayMongo Webhook Received', ['payload' => $payload]);

        $eventType = $payload['data']['attributes']['type'] ?? null;
        
        if ($eventType === 'checkout_session.payment.paid') {
            $sessionData = $payload['data']['attributes']['data'] ?? null;
            if (!$sessionData) {
                return response()->json(['status' => 'ignored']);
            }

            $sessionId = $sessionData['id'] ?? null;
            $status = $sessionData['attributes']['payment_status'] ?? ($sessionData['attributes']['status'] ?? null);

            if ($sessionId && $status === 'paid') {
                // Check if it's an Order
                $order = Order::where('paymongo_session_id', $sessionId)->first();
                if ($order && $order->payment_status !== 'paid') {
                    $order->update([
                        'payment_status' => 'paid',
                        'paymongo_session_id' => null, // Clear session ID
                    ]);
                    Log::info('Order marked as paid via Webhook', ['order_id' => $order->id]);
                    return response()->json(['status' => 'success']);
                }

                // Check if it's a SubscriptionTransaction
                $transaction = SubscriptionTransaction::where('paymongo_session_id', $sessionId)->first();
                if ($transaction && $transaction->status !== 'paid') {
                    app(SubscriptionService::class)->activateSubscription($transaction);
                    Log::info('Subscription marked as paid via Webhook', ['transaction_id' => $transaction->id]);
                    return response()->json(['status' => 'success']);
                }
            }
        }

        return response()->json(['status' => 'ignored']);
    }
}
