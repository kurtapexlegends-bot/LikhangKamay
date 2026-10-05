<?php

namespace Tests\Feature\Payments;

use App\Actions\Consumer\GetBuyerOrders;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\PayMongoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Mockery;
use Tests\TestCase;

class MayaPaymentIntegrationTest extends TestCase
{
    use RefreshDatabase;

    protected User $buyer;
    protected User $artisan;
    protected Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Maya Buyer',
            'email' => 'maya.buyer@example.com',
        ]);

        $this->artisan = User::factory()->artisanApproved()->create([
            'name' => 'Artisan Studio',
            'shop_name' => 'Handmade Pottery Studio',
            'city' => 'Dasmariñas',
        ]);

        $this->product = Product::create([
            'user_id' => $this->artisan->id,
            'artisan_id' => $this->artisan->id,
            'name' => 'Handmade Ceramic Planter',
            'sku' => 'PLANT-001',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 350.00,
            'cost_price' => 150.00,
            'stock' => 15,
            'sold' => 0,
            'rating' => 0,
            'reviews_count' => 0,
            'production_method' => 'ready_stock',
        ]);
    }

    /**
     * Test 1: Buyer can place delivery order with Maya payment method.
     */
    public function test_buyer_can_place_delivery_order_with_maya_payment_method(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [
                ['id' => $this->product->id, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_method' => 'Delivery',
            'payment_method' => 'Maya',
            'recipient_name' => 'Maria Santos',
            'phone_number' => '09181234567',
            'shipping_street_address' => '456 Sampaguita St.',
            'shipping_barangay' => 'San Jose',
            'shipping_city' => 'Dasmariñas',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address' => '456 Sampaguita St., San Jose, Dasmariñas, Cavite, 4114',
            'shipping_address_type' => 'home',
            'total' => 350.00,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('my-orders.index'));

        $this->assertDatabaseHas('orders', [
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'payment_method' => 'Maya',
            'payment_status' => 'pending',
            'status' => 'Pending',
        ]);
    }

    /**
     * Test 2: Store pickup always defaults to COD even if Maya was passed.
     */
    public function test_store_pickup_order_forces_cod_regardless_of_online_method_passed(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [
                ['id' => $this->product->id, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_method' => 'Pick Up',
            'payment_method' => 'Maya',
            'total' => 350.00,
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect(route('my-orders.index'));

        $this->assertDatabaseHas('orders', [
            'user_id' => $this->buyer->id,
            'shipping_method' => 'Pick Up',
            'payment_method' => 'COD',
        ]);
    }

    /**
     * Test 3: Online payment initiation for Maya order targets paymaya in PayMongo session.
     */
    public function test_buyer_can_initiate_online_payment_for_maya_order(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-MAYA-' . strtoupper(fake()->bothify('??###')),
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 350.00,
            'convenience_fee_amount' => 10.50,
            'shipping_fee_amount' => 60.00,
            'platform_commission_amount' => 17.50,
            'seller_net_amount' => 332.50,
            'total_amount' => 420.50,
            'status' => 'Pending',
            'payment_method' => 'Maya',
            'payment_status' => 'pending',
            'shipping_address' => '456 Sampaguita St., Cavite',
            'shipping_address_type' => 'home',
            'shipping_method' => 'Delivery',
        ]);

        $order->items()->create([
            'product_id' => $this->product->id,
            'product_name' => $this->product->name,
            'variant' => 'Standard',
            'price' => 350.00,
            'quantity' => 1,
            'product_img' => null,
        ]);

        $paymongoMock = Mockery::mock(PayMongoService::class);
        $paymongoMock->shouldReceive('createCheckoutSession')
            ->once()
            ->with(Mockery::on(function ($data) use ($order) {
                return $data['reference_number'] === $order->order_number
                    && in_array('paymaya', $data['payment_method_types'], true);
            }))
            ->andReturn([
                'id' => 'cs_test_session_maya_789',
                'attributes' => [
                    'checkout_url' => 'https://checkout.paymongo.com/cs_test_session_maya_789',
                ],
            ]);

        $this->app->instance(PayMongoService::class, $paymongoMock);

        $response = $this->actingAs($this->buyer)->get(route('payment.pay', $order->order_number));

        $response->assertRedirect('https://checkout.paymongo.com/cs_test_session_maya_789');
        $this->assertSame('cs_test_session_maya_789', $order->fresh()->paymongo_session_id);
    }

    /**
     * Test 4: PayMongo webhook marks Maya order as paid.
     */
    public function test_paymongo_webhook_marks_maya_order_as_paid(): void
    {
        Config::set('services.paymongo.webhook_secret', 'whsk_test_maya_secret');

        $order = Order::create([
            'order_number' => 'ORD-MAYA-HOOK-1',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 350.00,
            'total_amount' => 350.00,
            'status' => 'Pending',
            'payment_method' => 'Maya',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_maya_webhook',
            'shipping_address' => '456 Sampaguita St., Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $timestamp = time();
        $payload = [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id' => 'cs_test_maya_webhook',
                        'attributes' => [
                            'payment_status' => 'paid',
                            'payments' => [
                                [
                                    'id' => 'pay_maya_98765',
                                    'attributes' => [
                                        'status' => 'paid',
                                        'source' => [
                                            'type' => 'paymaya',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $payloadJson = json_encode($payload);
        $signature = hash_hmac('sha256', "{$timestamp}.{$payloadJson}", 'whsk_test_maya_secret');

        $response = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => "t={$timestamp},te=test,li=live,v1={$signature}",
                'CONTENT_TYPE' => 'application/json',
            ],
            $payloadJson
        );

        $response->assertStatus(200);
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('Maya', $order->fresh()->payment_method);
        $this->assertSame('pay_maya_98765', $order->fresh()->payment_id);
    }

    /**
     * Test 5: Telemetry sync updates order method if customer paid with GCash on PayMongo.
     */
    public function test_webhook_syncs_order_method_if_customer_paid_with_gcash_instead(): void
    {
        Config::set('services.paymongo.webhook_secret', 'whsk_test_maya_secret');

        $order = Order::create([
            'order_number' => 'ORD-MAYA-HOOK-SWITCH',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 350.00,
            'total_amount' => 350.00,
            'status' => 'Pending',
            'payment_method' => 'Maya',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_maya_switched',
            'shipping_address' => '456 Sampaguita St., Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $timestamp = time();
        $payload = [
            'data' => [
                'attributes' => [
                    'type' => 'checkout_session.payment.paid',
                    'data' => [
                        'id' => 'cs_test_maya_switched',
                        'attributes' => [
                            'payment_status' => 'paid',
                            'payments' => [
                                [
                                    'id' => 'pay_gcash_switched_123',
                                    'attributes' => [
                                        'status' => 'paid',
                                        'source' => [
                                            'type' => 'gcash',
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $payloadJson = json_encode($payload);
        $signature = hash_hmac('sha256', "{$timestamp}.{$payloadJson}", 'whsk_test_maya_secret');

        $response = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => "t={$timestamp},te=test,li=live,v1={$signature}",
                'CONTENT_TYPE' => 'application/json',
            ],
            $payloadJson
        );

        $response->assertStatus(200);
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('GCash', $order->fresh()->payment_method);
        $this->assertSame('pay_gcash_switched_123', $order->fresh()->payment_id);
    }

    /**
     * Test 6: GetBuyerOrders reconciles pending Maya order against PayMongo session.
     */
    public function test_get_buyer_orders_reconciles_pending_maya_order(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-MAYA-RECON-1',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 350.00,
            'total_amount' => 350.00,
            'status' => 'Pending',
            'payment_method' => 'Maya',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_maya_recon',
            'shipping_address' => '456 Sampaguita St., Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $mock = Mockery::mock(PayMongoService::class);
        $mock->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_test_maya_recon')
            ->andReturn([
                'id' => 'cs_test_maya_recon',
                'attributes' => [
                    'reference_number' => $order->order_number,
                    'payment_status' => 'paid',
                    'payments' => [
                        [
                            'id' => 'pay_maya_recon_88',
                            'attributes' => [
                                'status' => 'paid',
                                'source' => [
                                    'type' => 'paymaya',
                                ],
                            ],
                        ],
                    ],
                ],
            ]);

        $this->app->instance(PayMongoService::class, $mock);

        $action = app(GetBuyerOrders::class);
        $action->execute($this->buyer);

        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('Maya', $order->fresh()->payment_method);
        $this->assertSame('pay_maya_recon_88', $order->fresh()->payment_id);
    }

    /**
     * Test 7: Artisan can set Maya disbursement details with unformatted number.
     */
    public function test_artisan_can_update_maya_settlement_details_with_unformatted_number(): void
    {
        $response = $this->actingAs($this->artisan)->post(route('seller.settings.payout'), [
            'disbursement_method' => 'maya',
            'account_name' => 'Maria Santos Artisan',
            'account_number' => '+63 920-555-9876',
        ]);

        $response->assertSessionHasNoErrors();
        $response->assertRedirect();

        $this->artisan->refresh();
        $this->assertSame('Maya', $this->artisan->payout_method);
        $this->assertSame('Maria Santos Artisan', $this->artisan->payout_account_name);
        $this->assertSame('09205559876', $this->artisan->payout_account_number);
    }
}
