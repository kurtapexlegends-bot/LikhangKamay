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
}
