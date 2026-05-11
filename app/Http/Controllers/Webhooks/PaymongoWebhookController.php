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
