<?php

namespace Tests\Feature\Payments;

use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class PaymongoWebhookSignatureTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Config::set('services.paymongo.webhook_secret', 'whsk_test_secret_key');
    }

    public function test_webhook_unauthorized_if_signature_header_missing(): void
    {
        $response = $this->postJson(route('webhooks.paymongo'), [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                ]
            ]
        ]);

        $response->assertStatus(401);
    }

    public function test_webhook_unauthorized_if_signature_mismatched(): void
    {
        $response = $this->postJson(
            route('webhooks.paymongo'),
            [
                'data' => [
                    'attributes' => [
                        'type' => 'checkout_session.payment.paid',
                    ]
                ]
            ],
            [
                'Paymongo-Signature' => 't=' . time() . ',v1=invalid_signature'
            ]
        );

        $response->assertStatus(401);
    }

    public function test_webhook_unauthorized_if_timestamp_is_too_old(): void
    {
        $payload = json_encode([
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                ]
            ]
        ]);

        $oldTimestamp = time() - 400; // > 300 seconds
        $signature = hash_hmac('sha256', $oldTimestamp . '.' . $payload, 'whsk_test_secret_key');

        $response = $this->post(
            route('webhooks.paymongo'),
            [
                'data' => [
                    'attributes' => [
                        'type' => 'checkout_session.payment.paid',
                    ]
                ]
            ],
            [
                'Paymongo-Signature' => 't=' . $oldTimestamp . ',v1=' . $signature,
                'CONTENT_TYPE' => 'application/json'
            ]
        );

        $response->assertStatus(401);
    }

    public function test_webhook_processes_successfully_with_valid_signature(): void
    {
        $buyer = User::factory()->create();
        $seller = User::factory()->artisanApproved()->create();

        $order = Order::create([
            'order_number' => 'ORD-WEBHOOK-' . strtoupper(fake()->bothify('??###')),
            'user_id' => $buyer->id,
            'artisan_id' => $seller->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => 500,
            'convenience_fee_amount' => 15,
            'platform_commission_amount' => 25,
            'seller_net_amount' => 475,
            'total_amount' => 515,
            'status' => 'Pending',
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'shipping_address' => '123 Pay Street, Cavite',
            'shipping_address_type' => 'home',
            'shipping_method' => 'Delivery',
            'paymongo_session_id' => 'cs_webhook_valid_123',
        ]);

        $payloadData = [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id' => 'cs_webhook_valid_123',
                        'attributes' => [
                            'payment_status' => 'paid',
                        ]
                    ]
                ]
            ]
        ];

        $payload = json_encode($payloadData);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp . '.' . $payload, 'whsk_test_secret_key');

        $response = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => 't=' . $timestamp . ',v1=' . $signature,
                'CONTENT_TYPE' => 'application/json'
            ],
            $payload
        );

        $response->assertStatus(200);
        $this->assertSame('paid', $order->fresh()->payment_status);
    }
}
