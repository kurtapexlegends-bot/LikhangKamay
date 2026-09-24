<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

use App\Services\OrderLogisticsService;

class LalamoveWebhookController extends Controller
{
    /**
     * Handle Lalamove Webhook calls.
     */
    public function __invoke(Request $request, OrderLogisticsService $logisticsService)
    {
        Log::info('Lalamove Webhook received', $request->all());

        $token = $request->bearerToken() ?: $request->header('X-Webhook-Token', $request->query('token'));
        $expectedToken = config('services.lalamove.webhook_secret');

        if (empty($expectedToken) || empty($token) || !hash_equals((string) $expectedToken, (string) $token)) {
            Log::warning('Lalamove Webhook: Unauthorized access attempt', [
                'ip' => $request->ip(),
                'has_token' => !empty($token),
            ]);
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        try {
            $logisticsService->handleWebhook($request->all(), $request->getContent());
            return response()->json(['status' => 'received']);
        } catch (\Throwable $e) {
            Log::error('Lalamove Webhook Processing Error', [
                'error' => $e->getMessage(),
                'payload' => $request->all()
            ]);
            // Return 200 to acknowledge receipt even if processing fails, to prevent retries of bad payloads
            return response()->json(['status' => 'error', 'message' => 'Processing failed'], 200);
        }
    }
}
