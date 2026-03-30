<?php

namespace App\Http\Controllers;

use App\Services\OrderLogisticsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LalamoveWebhookController extends Controller
{
    public function __invoke(Request $request, OrderLogisticsService $orderLogisticsService): JsonResponse
    {
        $expectedToken = (string) config('services.lalamove.webhook_secret', '');
        $providedToken = (string) ($request->query('token') ?: $request->header('X-Lalamove-Webhook-Token', ''));

        if ($expectedToken === '') {
            return response()->json(['message' => 'Lalamove webhook secret is not configured.'], 503);
        }

        if ($providedToken === '' || !hash_equals($expectedToken, $providedToken)) {
            return response()->json(['message' => 'Unauthorized webhook request.'], 401);
        }

        $payload = $request->json()->all();

        if (empty($payload)) {
            $payload = $request->all();
        }

        if (empty($payload)) {
            return response()->json(['message' => 'Webhook payload is required.'], 400);
        }

        try {
            $orderLogisticsService->handleWebhook($payload, (string) $request->getContent());
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => 'Webhook processing failed.'], 500);
        }

        return response()->json(['ok' => true]);
    }
}
