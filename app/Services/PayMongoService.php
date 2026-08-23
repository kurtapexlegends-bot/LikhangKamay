<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class PayMongoService
{
    protected $baseUrl = 'https://api.paymongo.com/v1';
    protected $secretKey;

    public function __construct()
    {
        $this->secretKey = config('services.paymongo.secret_key');
    }

    /**
     * Create a Checkout Session
     * https://developers.paymongo.com/docs/create-a-checkout-session
     */
    public function createCheckoutSession(array $data)
    {
        /** @var \Illuminate\Http\Client\Response $response */
        $response = Http::withHeaders([
            'Authorization' => 'Basic ' . base64_encode($this->secretKey),
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])->post("{$this->baseUrl}/checkout_sessions", [
            'data' => [
                'attributes' => $data
            ]
        ]);

        if ($response->failed()) {
            throw new \Exception('PayMongo Error: ' . $response->body());
        }

        return $response->json('data');
    }

    /**
     * Retrieve a Checkout Session
     */
    public function retrieveCheckoutSession($sessionId)
    {
        /** @var \Illuminate\Http\Client\Response $response */
        $response = Http::withHeaders([
            'Authorization' => 'Basic ' . base64_encode($this->secretKey),
            'Accept' => 'application/json',
        ])->get("{$this->baseUrl}/checkout_sessions/{$sessionId}", [
            'include' => 'payments',
        ]);

        if ($response->failed()) {
            throw new \Exception('PayMongo Error: ' . $response->body());
        }

        return $response->json('data');
    }

    /**
     * Create a Refund for a Payment
     * https://developers.paymongo.com/docs/refunds
     */
    public function createRefund(string $paymentId, int $amountInCents, string $reason = 'requested_by_customer', ?string $notes = null): ?array
    {
        if (empty($this->secretKey) || empty($paymentId)) {
            return null;
        }

        $payload = [
            'amount' => $amountInCents,
            'payment_id' => $paymentId,
            'reason' => $reason,
        ];

        if ($notes) {
            $payload['notes'] = $notes;
        }

        /** @var \Illuminate\Http\Client\Response $response */
        $response = Http::withHeaders([
            'Authorization' => 'Basic ' . base64_encode($this->secretKey),
            'Content-Type' => 'application/json',
            'Accept' => 'application/json',
        ])->post("{$this->baseUrl}/refunds", [
            'data' => [
                'attributes' => $payload
            ]
        ]);

        if ($response->failed()) {
            \Illuminate\Support\Facades\Log::warning('PayMongo Refund Error: ' . $response->body(), [
                'payment_id' => $paymentId,
                'amount' => $amountInCents,
            ]);
            return null;
        }

        return $response->json('data');
    }
}
