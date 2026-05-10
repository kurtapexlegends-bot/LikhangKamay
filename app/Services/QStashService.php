<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class QStashService
{
    protected string $token;
    protected string $baseUrl;

    public function __construct()
    {
        $this->token = config('services.qstash.token', '');
        $this->baseUrl = 'https://qstash.upstash.io/v2/publish/';
    }

    /**
     * Dispatch a job to be handled asynchronously via a webhook.
     */
    public function dispatch(string $jobType, array $payload = []): bool
    {
        if (empty($this->token)) {
            Log::warning("QStash token missing. Executing job synchronously: {$jobType}");
            return false; 
        }

        $appUrl = config('app.url');
        $webhookUrl = "{$appUrl}/api/webhooks/qstash-handler";

        try {
            $response = Http::withHeaders([
                'Authorization' => "Bearer {$this->token}",
                'Content-Type' => 'application/json',
            ])->post($this->baseUrl . $webhookUrl, [
                'type' => $jobType,
                'data' => $payload,
                'secret' => config('services.qstash.secret'),
            ]);

            return $response->successful();
        } catch (\Exception $e) {
            Log::error("QStash Dispatch Failed: " . $e->getMessage());
            return false;
        }
    }
}
