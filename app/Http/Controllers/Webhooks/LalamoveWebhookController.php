<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\OrderLogisticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use stdClass;

class LalamoveWebhookController extends Controller
{
    /**
     * Handle Lalamove Webhook calls.
     */
    public function __invoke(Request $request, OrderLogisticsService $logisticsService)
    {
        $rawBody = $request->getContent();
        $body = json_decode($rawBody);

        // Lalamove checks the endpoint with an empty request before registering it.
        if (trim($rawBody) === '' || ($body instanceof stdClass && get_object_vars($body) === [])) {
            return response()->json(['status' => 'received']);
        }

        $token = $request->bearerToken() ?: $request->header('X-Webhook-Token', $request->query('token'));
        $expectedToken = (string) config('services.lalamove.webhook_secret');
        $hasValidToken = $expectedToken !== '' && is_string($token) && hash_equals($expectedToken, $token);

        if (!$body instanceof stdClass || (!$hasValidToken && !$this->hasValidSignature($body, $request->getPathInfo()))) {
            Log::warning('Lalamove Webhook: Unauthorized access attempt');
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        try {
            $logisticsService->handleWebhook(json_decode($rawBody, true), $rawBody);
            return response()->json(['status' => 'received']);
        } catch (\Throwable $e) {
            Log::error('Lalamove Webhook Processing Error', ['exception_type' => $e::class]);
            return response()->json(['status' => 'error', 'message' => 'Processing failed'], 503);
        }
    }

    private function hasValidSignature(stdClass $body, string $path): bool
    {
        $apiKey = (string) config('services.lalamove.api_key');
        $apiSecret = (string) config('services.lalamove.api_secret');
        $timestamp = $body->timestamp ?? null;

        if ($apiKey === '' || $apiSecret === '' || !is_string($body->apiKey ?? null)
            || !hash_equals($apiKey, $body->apiKey) || !is_string($body->signature ?? null)
            || (!is_int($timestamp) && !is_string($timestamp)) || !ctype_digit((string) $timestamp)
            || !(($body->data ?? null) instanceof stdClass)) {
            return false;
        }

        $signedData = json_encode($body->data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_LINE_TERMINATORS);
        if ($signedData === false) {
            return false;
        }

        // Live Lalamove v3 events sign the nested data with CRLF separators.
        $signature = hash_hmac('sha256', "{$timestamp}\r\nPOST\r\n{$path}\r\n\r\n{$signedData}", $apiSecret);

        return hash_equals($signature, $body->signature);
    }
}
