<?php

namespace App\Services;

use Illuminate\Http\Client\Response;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

class LalamoveService
{
    public function __construct(
        private readonly string $apiKey = '',
        private readonly string $apiSecret = '',
        private readonly string $market = '',
        private readonly string $environment = '',
    ) {
    }

    public function createQuotation(array $payload): array
    {
        return $this->request('POST', '/v3/quotations', ['data' => $payload]);
    }

    public function createOrder(array $payload): array
    {
        return $this->request('POST', '/v3/orders', ['data' => $payload]);
    }

    public function retrieveOrder(string $orderId): array
    {
        return $this->request('GET', '/v3/orders/' . $orderId);
    }

    public function registerWebhook(string $url): array
    {
        return $this->request('PATCH', '/v3/webhook', ['data' => ['url' => $url]]);
    }

    public function normalizePhone(string $phone): string
    {
        $digits = preg_replace('/\D+/', '', trim($phone));

        if ($digits === null || $digits === '') {
            throw new \RuntimeException('Phone number is required for Lalamove booking.');
        }

        if (str_starts_with($digits, '63')) {
            return '+' . $digits;
        }

        if (str_starts_with($digits, '0')) {
            return '+63' . substr($digits, 1);
        }

        if (strlen($digits) === 10 && str_starts_with($digits, '9')) {
            return '+63' . $digits;
        }

        if (str_starts_with($phone, '+')) {
            return $phone;
        }

        throw new \RuntimeException('Phone number must be a valid Philippine mobile number.');
    }

    private function request(string $method, string $path, ?array $payload = null): array
    {
        $apiKey = $this->resolveApiKey();
        $apiSecret = $this->resolveApiSecret();
        $market = $this->resolveMarket();
        $body = $payload ? json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : '';

        $timestamp = (string) round(microtime(true) * 1000);
        $rawSignature = "{$timestamp}\r\n{$method}\r\n{$path}\r\n\r\n{$body}";
        $signature = hash_hmac('sha256', $rawSignature, $apiSecret);
        $requestId = (string) Str::uuid();

        $request = Http::withHeaders([
            'Authorization' => 'hmac ' . "{$apiKey}:{$timestamp}:{$signature}",
            'Market' => $market,
            'Request-ID' => $requestId,
            'Accept' => 'application/json',
            'Content-Type' => 'application/json',
        ])->timeout(20);

        $url = $this->resolveBaseUrl() . $path;
        /** @var Response $response */
        $response = match (strtoupper($method)) {
            'POST' => $request->withBody($body, 'application/json')->post($url),
            'PATCH' => $request->withBody($body, 'application/json')->patch($url),
            default => $request->get($url),
        };

        if ($response->failed()) {
            $message = $response->json('message')
                ?? $response->json('errors.0.message')
                ?? $response->body()
                ?? 'Lalamove request failed.';

            throw new \RuntimeException('Lalamove: ' . $message);
        }

        return (array) ($response->json('data') ?? []);
    }

    private function resolveApiKey(): string
    {
        $value = $this->apiKey !== '' ? $this->apiKey : (string) config('services.lalamove.api_key', '');

        if ($value === '') {
            throw new \RuntimeException('Lalamove API key is not configured.');
        }

        return $value;
    }

    private function resolveApiSecret(): string
    {
        $value = $this->apiSecret !== '' ? $this->apiSecret : (string) config('services.lalamove.api_secret', '');

        if ($value === '') {
            throw new \RuntimeException('Lalamove API secret is not configured.');
        }

        return $value;
    }

    private function resolveMarket(): string
    {
        return strtoupper($this->market !== '' ? $this->market : (string) config('services.lalamove.market', 'PH'));
    }

    private function resolveBaseUrl(): string
    {
        $environment = strtolower($this->environment !== '' ? $this->environment : (string) config('services.lalamove.environment', 'sandbox'));

        return $environment === 'production'
            ? 'https://rest.lalamove.com'
            : 'https://rest.sandbox.lalamove.com';
    }
}
