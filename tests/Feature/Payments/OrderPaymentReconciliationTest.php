<?php

namespace Tests\Feature\Payments;

use App\Actions\Consumer\GetBuyerOrders;
use App\Actions\Seller\Orders\ListSellerOrders;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\OrderPaymentReconciliationService;
use App\Services\PayMongoService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Mockery;
use Tests\TestCase;

class OrderPaymentReconciliationTest extends TestCase
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
            'name' => 'Customer Kurt',
            'email' => 'kurt.customer@example.com',
        ]);

        $this->artisan = User::factory()->artisanApproved()->create([
            'name' => 'Kurt Seller',
            'shop_name' => 'Kurt Shop',
            'city' => 'Dasmariñas',
        ]);

        $this->product = Product::create([
            'user_id' => $this->artisan->id,
            'artisan_id' => $this->artisan->id,
            'name' => 'Blue Feather Vase',
            'sku' => 'VASE-001',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 900.00,
            'cost_price' => 400.00,
            'stock' => 10,
            'sold' => 0,
            'rating' => 0,
            'reviews_count' => 0,
            'production_method' => 'made_to_order',
        ]);
    }

    /**
     * Test 1: An order in 'Processing' status (e.g. Currently Being Crafted) CAN be reconciled as paid.
     */
    public function test_reconciles_order_in_processing_status_as_paid(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-6AF18476EA79A',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 900.00,
            'convenience_fee_amount' => 27.00,
            'shipping_fee_amount' => 99.00,
            'platform_commission_amount' => 45.00,
            'seller_net_amount' => 900.00,
            'total_amount' => 1026.00,
            'status' => Order::STATUS_PROCESSING,
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_processing_kurt',
            'shipping_address' => 'PNB, Aguinaldo Highway, Zone IV, Dasmariñas City',
            'shipping_method' => 'Delivery',
        ]);

        $mockPaymongo = Mockery::mock(PayMongoService::class);
        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_test_processing_kurt')
            ->andReturn([
                'id' => 'cs_test_processing_kurt',
                'attributes' => [
                    'payment_status' => 'paid',
                    'reference_number' => $order->order_number,
                    'payments' => [
                        [
                            'id' => 'pay_gcash_kurt_999',
                            'attributes' => [
                                'status' => 'paid',
                                'source' => ['type' => 'gcash'],
                            ],
                        ],
                    ],
                ],
            ]);
        $this->app->instance(PayMongoService::class, $mockPaymongo);

        $service = app(OrderPaymentReconciliationService::class);
        $reconciled = $service->reconcileOrder($order, force: true);

        $this->assertTrue($reconciled);
        $order->refresh();
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame('GCash', $order->payment_method);
        $this->assertSame('pay_gcash_kurt_999', $order->payment_id);
        $this->assertSame(Order::STATUS_PROCESSING, $order->status);
    }

    /**
     * Test 2: Seller's ListSellerOrders automatically reconciles pending online orders on page load.
     */
    public function test_seller_orders_page_automatically_reconciles_pending_processing_orders(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-SELLER-RECON-01',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 900.00,
            'total_amount' => 1026.00,
            'status' => Order::STATUS_PROCESSING,
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_seller_recon',
            'shipping_address' => 'Dasmariñas City, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $mockPaymongo = Mockery::mock(PayMongoService::class);
        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_test_seller_recon')
            ->andReturn([
                'id' => 'cs_test_seller_recon',
                'attributes' => [
                    'payment_status' => 'paid',
                    'payments' => [
                        [
                            'id' => 'pay_seller_001',
                            'attributes' => [
                                'status' => 'paid',
                                'source' => ['type' => 'gcash'],
                            ],
                        ],
                    ],
                ],
            ]);
        $this->app->instance(PayMongoService::class, $mockPaymongo);

        $listSellerOrders = app(ListSellerOrders::class);
        $result = $listSellerOrders->execute($this->artisan->id, $this->artisan, []);

        $order->refresh();
        $this->assertSame('paid', $order->payment_status);
        $this->assertSame('pay_seller_001', $order->payment_id);
    }

    /**
     * Test 3: Buyer's GetBuyerOrders automatically reconciles pending processing orders.
     */
    public function test_buyer_my_orders_reconciles_pending_processing_orders(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-BUYER-RECON-01',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 900.00,
            'total_amount' => 1026.00,
            'status' => Order::STATUS_PROCESSING,
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_buyer_recon',
            'shipping_address' => 'Dasmariñas City, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $mockPaymongo = Mockery::mock(PayMongoService::class);
        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_test_buyer_recon')
            ->andReturn([
                'id' => 'cs_test_buyer_recon',
                'attributes' => [
                    'payment_status' => 'paid',
                    'payments' => [
                        [
                            'id' => 'pay_buyer_001',
                            'attributes' => [
                                'status' => 'paid',
                                'source' => ['type' => 'gcash'],
                            ],
                        ],
                    ],
                ],
            ]);
        $this->app->instance(PayMongoService::class, $mockPaymongo);

        $getBuyerOrders = app(GetBuyerOrders::class);
        $orders = $getBuyerOrders->execute($this->buyer);

        $order->refresh();
        $this->assertSame('paid', $order->payment_status);
        $serialized = $orders->firstWhere('order_number', $order->order_number);
        $this->assertSame('paid', $serialized['payment_status']);
    }

    /**
     * Test 4: On-demand POST /payment/{order_number}/verify verifies payment with PayMongo.
     */
    public function test_payment_verify_endpoint_allows_buyer_and_seller_to_verify_on_demand(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-ONDEMAND-01',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 900.00,
            'total_amount' => 1026.00,
            'status' => Order::STATUS_PROCESSING,
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_ondemand',
            'shipping_address' => 'Dasmariñas City, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $mockPaymongo = Mockery::mock(PayMongoService::class);
        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_test_ondemand')
            ->andReturn([
                'id' => 'cs_test_ondemand',
                'attributes' => [
                    'payment_status' => 'paid',
                    'payments' => [
                        [
                            'id' => 'pay_ondemand_001',
                            'attributes' => [
                                'status' => 'paid',
                                'source' => ['type' => 'gcash'],
                            ],
                        ],
                    ],
                ],
            ]);
        $this->app->instance(PayMongoService::class, $mockPaymongo);

        $response = $this->actingAs($this->buyer)
            ->postJson(route('payment.verify', $order->order_number));

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'is_paid' => true,
                'payment_status' => 'paid',
            ]);

        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('pay_ondemand_001', $order->fresh()->payment_id);
    }

    /**
     * Test 5: PayMongo payment.paid webhook event marks an Order as paid.
     */
    public function test_paymongo_payment_paid_webhook_reconciles_regular_orders(): void
    {
        Config::set('services.paymongo.webhook_secret', 'whsk_test_reconcile_secret');

        $order = Order::create([
            'order_number' => 'ORD-PAYPAID-HOOK',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 900.00,
            'total_amount' => 1026.00,
            'status' => Order::STATUS_PROCESSING,
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_paypaid_hook',
            'shipping_address' => 'Dasmariñas City, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $timestamp = time();
        $payload = [
            'data' => [
                'attributes' => [
                    'type' => 'payment.paid',
                    'data' => [
                        'id' => 'pay_webhook_direct_123',
                        'attributes' => [
                            'checkout_session_id' => 'cs_test_paypaid_hook',
                            'status' => 'paid',
                            'source' => [
                                'type' => 'gcash',
                            ],
                            'metadata' => [
                                'reference_number' => $order->order_number,
                            ],
                        ],
                    ],
                ],
            ],
        ];

        $payloadJson = json_encode($payload);
        $signature = hash_hmac('sha256', "{$timestamp}.{$payloadJson}", 'whsk_test_reconcile_secret');

        $response = $this->call(
            'POST',
            route('webhooks.paymongo'),
            [],
            [],
            [],
            [
                'HTTP_Paymongo-Signature' => "t={$timestamp},v1={$signature}",
                'CONTENT_TYPE' => 'application/json',
            ],
            $payloadJson
        );

        $response->assertOk();
        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('pay_webhook_direct_123', $order->fresh()->payment_id);
    }

    /**
     * Test 6: PaymentController@success marks an order in 'Processing' status as paid.
     */
    public function test_payment_success_redirect_finalizes_processing_order_as_paid(): void
    {
        $order = Order::create([
            'order_number' => 'ORD-SUCCESS-PROC-01',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => $this->buyer->name,
            'merchandise_subtotal' => 900.00,
            'total_amount' => 1026.00,
            'status' => Order::STATUS_PROCESSING,
            'payment_method' => 'GCash',
            'payment_status' => 'pending',
            'paymongo_session_id' => 'cs_test_success_proc',
            'shipping_address' => 'Dasmariñas City, Cavite',
            'shipping_method' => 'Delivery',
        ]);

        $mockPaymongo = Mockery::mock(PayMongoService::class);
        $mockPaymongo->shouldReceive('retrieveCheckoutSession')
            ->once()
            ->with('cs_test_success_proc')
            ->andReturn([
                'id' => 'cs_test_success_proc',
                'attributes' => [
                    'payment_status' => 'paid',
                    'reference_number' => $order->order_number,
                    'payments' => [
                        [
                            'id' => 'pay_success_001',
                            'attributes' => [
                                'status' => 'paid',
                                'source' => ['type' => 'gcash'],
                            ],
                        ],
                    ],
                ],
            ]);
        $this->app->instance(PayMongoService::class, $mockPaymongo);

        $response = $this->actingAs($this->buyer)
            ->get(route('payment.success', ['order_id' => $order->order_number]));

        $response->assertRedirect(route('my-orders.index'))
            ->assertSessionHas('success', 'Payment successful! Order #' . $order->order_number . ' is now paid.');

        $this->assertSame('paid', $order->fresh()->payment_status);
        $this->assertSame('pay_success_001', $order->fresh()->payment_id);
    }
}
