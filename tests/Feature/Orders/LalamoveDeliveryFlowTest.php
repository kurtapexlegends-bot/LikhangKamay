<?php

namespace Tests\Feature\Orders;

use App\Mail\ShipmentReminder;
use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\Product;
use App\Models\User;
use App\Notifications\OrderDeliveryUpdateNotification;
use App\Services\AddressGeocodingService;
use App\Services\LalamoveService;
use App\Services\WalletService;
use App\Support\StructuredAddress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use Tests\TestCase;

class LalamoveDeliveryFlowTest extends TestCase
{
    use RefreshDatabase;
    use MockeryPHPUnitIntegration;

    protected function setUp(): void
    {
        parent::setUp();

        config()->set('services.lalamove.webhook_secret', 'test-webhook-secret');
    }

    public function test_seller_can_create_a_lalamove_delivery_for_an_accepted_delivery_order(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne([
            'name' => 'Buyer Example',
            'phone_number' => '09171234567',
        ]);

        $product = $this->createProduct($seller, stock: 10);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product);

        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::on(function ($value) use ($seller) {
                return is_array($value)
                    && in_array('123 Seller Street, San Miguel I, Dasmarinas City, Cavite, 4115', $value, true);
            }), 'seller pickup')
            ->andReturn([
                'lat' => '14.3294',
                'lng' => '120.9367',
                'display_name' => 'Seller',
                'matched_query' => '123 Seller Street, San Miguel I, Dasmarinas City, Cavite, 4115, Philippines',
            ]);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::on(function ($value) use ($order) {
                return is_array($value)
                    && in_array($order->shipping_address, $value, true);
            }), 'buyer drop-off')
            ->andReturn([
                'lat' => '14.3330',
                'lng' => '120.9420',
                'display_name' => 'Buyer',
                'matched_query' => $order->shipping_address,
            ]);
        $this->app->instance(AddressGeocodingService::class, $geocoder);

        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldReceive('createQuotation')
            ->once()
            ->andReturn([
                'quotationId' => 'qt_123',
                'serviceType' => 'MOTORCYCLE',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 185.50],
                'stops' => [
                    ['stopId' => 'stop_pickup'],
                    ['stopId' => 'stop_dropoff'],
                ],
            ]);
        $lalamove->shouldReceive('normalizePhone')
            ->times(2)
            ->andReturn('+639171234567');
        $lalamove->shouldReceive('createOrder')
            ->once()
            ->with(Mockery::on(function (array $payload) {
                return ($payload['metadata']['platform'] ?? null) === 'LikhangKamay'
                    && ($payload['recipients'][0]['remarks'] ?? null) === 'Ring the bell.';
            }))
            ->andReturn([
                'orderId' => 'llm_order_123',
                'status' => 'ASSIGNING_DRIVER',
                'shareLink' => 'https://track.lalamove.test/llm_order_123',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 185.50],
            ]);
        $this->app->instance(LalamoveService::class, $lalamove);

        $response = $this
            ->from(route('orders.index'))
            ->actingAs($seller)
            ->post(route('orders.lalamove.store', $order->order_number));

        $response
            ->assertRedirect(route('orders.index'))
            ->assertSessionHas('success');

        $order->refresh();
        $delivery = $order->delivery;

        $this->assertNotNull($delivery);
        $this->assertSame('Shipped', $order->status);
        $this->assertSame('llm_order_123', $order->tracking_number);
        $this->assertSame(OrderDelivery::PROVIDER_LALAMOVE, $delivery->provider);
        $this->assertSame('ASSIGNING_DRIVER', $delivery->status);
        $this->assertSame('llm_order_123', $delivery->external_order_id);
        $this->assertSame('https://track.lalamove.test/llm_order_123', $delivery->share_link);

        Notification::assertSentTo($buyer, OrderDeliveryUpdateNotification::class);
        Mail::assertQueued(\App\Mail\OrderShipped::class);
    }

    public function test_seller_default_address_book_entry_is_used_for_pickup_booking(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller([
            'street_address' => null,
            'city' => null,
            'phone_number' => null,
        ]);
        $seller->addresses()->create([
            'label' => 'Studio',
            'address_type' => 'other',
            'recipient_name' => 'Kurt Stanley Talastas',
            'phone_number' => '09922933689',
            'full_address' => 'Blk 35 Lot 18, Dasmarinas City, Cavite, Philippines',
            'is_default' => true,
        ]);

        $buyer = User::factory()->createOne([
            'name' => 'Buyer Example',
            'phone_number' => '09171234567',
        ]);

        $product = $this->createProduct($seller, stock: 10);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product);

        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::on(function ($value) {
                return is_array($value)
                    && in_array('Blk 35 Lot 18, Dasmarinas City, Cavite, Philippines', $value, true);
            }), 'seller pickup')
            ->andReturn([
                'lat' => '14.3294',
                'lng' => '120.9367',
                'display_name' => 'Seller',
                'matched_query' => 'Dasmarinas City, Cavite, Philippines',
            ]);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::on(function ($value) use ($order) {
                return is_array($value)
                    && in_array($order->shipping_address, $value, true);
            }), 'buyer drop-off')
            ->andReturn([
                'lat' => '14.3330',
                'lng' => '120.9420',
                'display_name' => 'Buyer',
                'matched_query' => $order->shipping_address,
            ]);
        $this->app->instance(AddressGeocodingService::class, $geocoder);

        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldReceive('createQuotation')
            ->once()
            ->with(Mockery::on(function (array $payload) {
                return ($payload['stops'][0]['address'] ?? null) === 'Dasmarinas City, Cavite, Philippines';
            }))
            ->andReturn([
                'quotationId' => 'qt_default_pickup',
                'serviceType' => 'MOTORCYCLE',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 185.50],
                'stops' => [
                    ['stopId' => 'stop_pickup'],
                    ['stopId' => 'stop_dropoff'],
                ],
            ]);
        $lalamove->shouldReceive('normalizePhone')
            ->once()
            ->with('09922933689')
            ->andReturn('+639922933689');
        $lalamove->shouldReceive('normalizePhone')
            ->once()
            ->with('09179998888')
            ->andReturn('+639179998888');
        $lalamove->shouldReceive('createOrder')
            ->once()
            ->andReturn([
                'orderId' => 'llm_order_default_pickup',
                'status' => 'ASSIGNING_DRIVER',
                'shareLink' => 'https://track.lalamove.test/llm_order_default_pickup',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 185.50],
            ]);
        $this->app->instance(LalamoveService::class, $lalamove);

        $response = $this
            ->from(route('orders.index'))
            ->actingAs($seller)
            ->post(route('orders.lalamove.store', $order->order_number));

        $response
            ->assertRedirect(route('orders.index'))
            ->assertSessionHas('success');

        $order->refresh();

        $this->assertSame('Shipped', $order->status);
        $this->assertNotNull($order->delivery);
    }

    public function test_lalamove_booking_omits_synthetic_driver_remarks_when_shipping_notes_are_blank(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne([
            'name' => 'Buyer Example',
            'phone_number' => '09171234567',
        ]);

        $product = $this->createProduct($seller, stock: 10);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'shipping_notes' => null,
        ]);

        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::type('array'), 'seller pickup')
            ->andReturn([
                'lat' => '14.3294',
                'lng' => '120.9367',
                'display_name' => 'Seller',
                'matched_query' => '123 Seller Street, San Miguel I, Dasmarinas City, Cavite, 4115, Philippines',
            ]);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::on(function ($value) use ($order) {
                return is_array($value)
                    && in_array($order->shipping_address, $value, true);
            }), 'buyer drop-off')
            ->andReturn([
                'lat' => '14.3330',
                'lng' => '120.9420',
                'display_name' => 'Buyer',
                'matched_query' => $order->shipping_address,
            ]);
        $this->app->instance(AddressGeocodingService::class, $geocoder);

        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldReceive('createQuotation')
            ->once()
            ->andReturn([
                'quotationId' => 'qt_no_notes',
                'serviceType' => 'MOTORCYCLE',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 185.50],
                'stops' => [
                    ['stopId' => 'stop_pickup'],
                    ['stopId' => 'stop_dropoff'],
                ],
            ]);
        $lalamove->shouldReceive('normalizePhone')
            ->times(2)
            ->andReturn('+639171234567');
        $lalamove->shouldReceive('createOrder')
            ->once()
            ->with(Mockery::on(function (array $payload) {
                return !array_key_exists('remarks', $payload['recipients'][0] ?? []);
            }))
            ->andReturn([
                'orderId' => 'llm_order_no_notes',
                'status' => 'ASSIGNING_DRIVER',
                'shareLink' => 'https://track.lalamove.test/llm_order_no_notes',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 185.50],
            ]);
        $this->app->instance(LalamoveService::class, $lalamove);

        $response = $this
            ->from(route('orders.index'))
            ->actingAs($seller)
            ->post(route('orders.lalamove.store', $order->order_number));

        $response
            ->assertRedirect(route('orders.index'))
            ->assertSessionHas('success');
    }

    public function test_checkout_persists_delivery_recipient_and_contact_information(): void
    {
        Mail::fake();
        Notification::fake();

        $buyer = User::factory()->createOne([
            'name' => 'Checkout Buyer',
            'phone_number' => '09170001111',
        ]);
        $seller = $this->createSeller();
        $product = $this->createProduct($seller, stock: 4, price: 1000);

        $response = $this
            ->actingAs($buyer)
            ->post(route('checkout.store'), [
                'items' => [[
                    'id' => $product->id,
                    'artisan_id' => $seller->id,
                    'qty' => 1,
                    'variant' => 'Standard',
                ]],
                'shipping_method' => 'Delivery',
                'selected_address_id' => 'new',
                'shipping_address' => '789 Courier Street, Bacoor, Cavite',
                'shipping_address_type' => 'home',
                'recipient_name' => 'Receiver Name',
                'phone_number' => '09175556666',
                'payment_method' => 'COD',
                'total' => 1030,
            ]);

        $response->assertRedirect(route('my-orders.index', absolute: false));

        $order = Order::query()->latest('id')->first();

        $this->assertNotNull($order);
        $this->assertSame('Receiver Name', $order->shipping_recipient_name);
        $this->assertSame('09175556666', $order->shipping_contact_phone);
    }

    public function test_seller_cannot_create_a_lalamove_delivery_when_required_contact_details_are_missing(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller(['phone_number' => null]);
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller, stock: 6);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'shipping_contact_phone' => null,
        ]);

        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldNotReceive('createQuotation');
        $lalamove->shouldNotReceive('createOrder');
        $this->app->instance(LalamoveService::class, $lalamove);

        $response = $this
            ->from(route('orders.index'))
            ->actingAs($seller)
            ->post(route('orders.lalamove.store', $order->order_number));

        $response
            ->assertRedirect(route('orders.index'))
            ->assertSessionHas('error');

        $order->refresh();

        $this->assertSame('Accepted', $order->status);
        $this->assertNull($order->delivery);
    }

    public function test_lalamove_completed_webhook_is_idempotent_and_marks_order_delivered(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller, stock: 5);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'status' => 'Shipped',
            'shipped_at' => now(),
        ]);

        $delivery = $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_ASSIGNING_DRIVER,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'llm_order_987',
            'quotation_id' => 'qt_987',
        ]);

        $payload = [
            'meta' => ['requestId' => 'webhook-1'],
            'eventType' => 'ORDER_STATUS_CHANGED',
            'data' => [
                'orderId' => 'llm_order_987',
                'status' => 'COMPLETED',
                'shareLink' => 'https://track.lalamove.test/llm_order_987',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 160.00],
            ],
        ];

        $this->postJson(route('webhooks.lalamove', ['token' => 'test-webhook-secret']), $payload)->assertOk();
        $this->postJson(route('webhooks.lalamove', ['token' => 'test-webhook-secret']), $payload)->assertOk();

        $order->refresh();
        $delivery->refresh();

        $this->assertSame('Delivered', $order->status);
        $this->assertNotNull($order->delivered_at);
        $this->assertSame(OrderDelivery::STATUS_COMPLETED, $delivery->status);
        $this->assertDatabaseCount('order_delivery_events', 1);

        Notification::assertSentTo($buyer, OrderDeliveryUpdateNotification::class);
        Notification::assertCount(1);
    }

    public function test_driver_assigned_webhook_promotes_delivery_to_on_going_even_without_status(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller, stock: 5);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'status' => 'Shipped',
            'shipped_at' => now(),
        ]);

        $delivery = $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_ASSIGNING_DRIVER,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'llm_driver_assigned',
            'quotation_id' => 'qt_driver_assigned',
        ]);

        $payload = [
            'meta' => ['requestId' => 'webhook-driver-assigned'],
            'eventType' => 'DRIVER_ASSIGNED',
            'data' => [
                'orderId' => 'llm_driver_assigned',
                'driverId' => 'driver_123',
                'shareLink' => 'https://track.lalamove.test/llm_driver_assigned',
            ],
        ];

        $this->postJson(route('webhooks.lalamove', ['token' => 'test-webhook-secret']), $payload)->assertOk();

        $delivery->refresh();

        $this->assertSame(OrderDelivery::STATUS_ON_GOING, $delivery->status);
        $this->assertSame('https://track.lalamove.test/llm_driver_assigned', $delivery->share_link);
        $this->assertSame('DRIVER_ASSIGNED', $delivery->last_webhook_type);
    }

    public function test_seller_orders_page_syncs_active_lalamove_delivery_status_from_live_api(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller, stock: 5);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'status' => 'Shipped',
            'shipped_at' => now(),
        ]);

        $delivery = $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_ASSIGNING_DRIVER,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'llm_live_sync',
            'quotation_id' => 'qt_live_sync',
        ]);

        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldReceive('retrieveOrder')
            ->once()
            ->with('llm_live_sync')
            ->andReturn([
                'orderId' => 'llm_live_sync',
                'status' => 'ASSIGNING_DRIVER',
                'driverId' => 'driver_live_123',
                'shareLink' => 'https://track.lalamove.test/llm_live_sync',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 160.00],
            ]);
        $this->app->instance(LalamoveService::class, $lalamove);

        $this->actingAs($seller)
            ->get(route('orders.index'))
            ->assertOk();

        $delivery->refresh();
        $order->refresh();

        $this->assertSame('Shipped', $order->status);
        $this->assertSame(OrderDelivery::STATUS_ON_GOING, $delivery->status);
        $this->assertSame('POLL_SYNC', $delivery->last_webhook_type);
        $this->assertSame('https://track.lalamove.test/llm_live_sync', $delivery->share_link);
    }

    public function test_lalamove_webhook_rejects_requests_without_the_expected_token(): void
    {
        $payload = [
            'meta' => ['requestId' => 'webhook-unauthorized'],
            'eventType' => 'ORDER_STATUS_CHANGED',
            'data' => [
                'orderId' => 'llm_order_unauthorized',
                'status' => 'COMPLETED',
            ],
        ];

        $this->postJson(route('webhooks.lalamove'), $payload)
            ->assertUnauthorized();
    }

    public function test_seller_cannot_book_lalamove_when_pickup_and_dropoff_are_the_same_address(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller, stock: 2);

        $sameAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => '123 Seller Street',
            'barangay' => 'San Miguel I',
            'city' => 'Dasmarinas City',
            'region' => 'Cavite',
            'postal_code' => '4115',
        ]);

        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'shipping_address' => $sameAddress,
            'shipping_street_address' => '123 Seller Street',
            'shipping_barangay' => 'San Miguel I',
            'shipping_city' => 'Dasmarinas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4115',
        ]);

        $response = $this
            ->from(route('orders.index'))
            ->actingAs($seller)
            ->post(route('orders.lalamove.store', $order->order_number));

        $response
            ->assertRedirect(route('orders.index'))
            ->assertSessionHas('error');

        $this->assertStringContainsString(
            'same address',
            (string) session('error')
        );
    }

    public function test_failed_lalamove_delivery_waits_for_hold_window_then_auto_cancels_and_refunds_paid_orders(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $walletService = app(WalletService::class);
        $walletService->getOrCreateWallet($buyer);

        $product = $this->createProduct($seller, stock: 3, price: 900);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'status' => 'Shipped',
            'payment_method' => 'Wallet',
            'payment_status' => 'paid',
            'merchandise_subtotal' => 900,
            'convenience_fee_amount' => 27,
            'platform_commission_amount' => 45,
            'seller_net_amount' => 855,
            'total_amount' => 927,
            'shipped_at' => now()->subDay(),
        ]);

        $delivery = $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_CANCELED,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'llm_order_fail',
            'quotation_id' => 'qt_fail',
            'terminal_failed_at' => now()->subDay()->subMinute(),
            'failure_reason' => 'Courier reported a terminal failure.',
        ]);

        $this->artisan('orders:auto-cancel-failed-deliveries')
            ->assertSuccessful();

        $order->refresh();
        $delivery->refresh();
        $buyer->refresh();
        $product->refresh();

        $this->assertSame('Cancelled', $order->status);
        $this->assertSame('refunded', $order->payment_status);
        $this->assertSame('return_to_sender_failed_delivery', $order->cancellation_reason);
        $this->assertNotNull($order->cancelled_at);
        $this->assertNotNull($delivery->auto_cancelled_at);
        $this->assertSame('927.00', $buyer->wallet->balance);
        $this->assertSame(3, $product->stock);
        $this->assertDatabaseHas('wallet_transactions', [
            'order_id' => $order->id,
            'category' => 'order_refund_credit',
            'direction' => 'credit',
            'amount' => '927.00',
        ]);
    }

    public function test_shipping_reminder_only_targets_orders_older_than_three_days(): void
    {
        Mail::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller, stock: 8);

        $recentOrder = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'accepted_at' => now()->subDays(2),
            'shipment_reminder_sent' => false,
        ]);

        $staleOrder = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'accepted_at' => now()->subDays(4),
            'shipment_reminder_sent' => false,
        ]);

        $this->artisan('orders:remind-shipping')
            ->assertSuccessful();

        $recentOrder->refresh();
        $staleOrder->refresh();

        Mail::assertSent(ShipmentReminder::class, 1);
        $this->assertFalse((bool) $recentOrder->shipment_reminder_sent);
        $this->assertTrue((bool) $staleOrder->shipment_reminder_sent);
    }

    private function createSeller(array $overrides = []): User
    {
        return User::factory()->artisanApproved()->createOne(array_merge([
            'name' => 'Seller Example',
            'shop_name' => 'Seller Example Studio',
            'street_address' => '123 Seller Street',
            'barangay' => 'San Miguel I',
            'city' => 'Dasmarinas City',
            'region' => 'Cavite',
            'zip_code' => '4115',
            'phone_number' => '09171234567',
        ], $overrides));
    }

    private function createProduct(User $seller, int $stock = 10, float $price = 1200): Product
    {
        return Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'sku' => 'LALA-' . fake()->unique()->numerify('####'),
            'name' => 'Lalamove Test Product',
            'description' => 'Courier flow test item.',
            'category' => 'Tableware',
            'status' => 'Active',
            'price' => $price,
            'cost_price' => round($price * 0.6, 2),
            'stock' => $stock,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);
    }

    private function createAcceptedDeliveryOrder(User $seller, User $buyer, Product $product, array $overrides = []): Order
    {
        $order = Order::create(array_merge([
            'order_number' => 'ORD-LALA-' . strtoupper(fake()->unique()->bothify('###??')),
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => $product->price,
            'convenience_fee_amount' => round($product->price * 0.03, 2),
            'platform_commission_amount' => round($product->price * 0.05, 2),
            'seller_net_amount' => round($product->price * 0.95, 2),
            'total_amount' => round($product->price * 1.03, 2),
            'status' => 'Accepted',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_method' => 'Delivery',
            'shipping_address' => '456 Buyer Street, Burol I, Dasmarinas City, Cavite, 4115',
            'shipping_street_address' => '456 Buyer Street',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmarinas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4115',
            'shipping_address_type' => 'home',
            'shipping_recipient_name' => 'Buyer Receiver',
            'shipping_contact_phone' => '09179998888',
            'shipping_notes' => 'Ring the bell.',
            'accepted_at' => now()->subHour(),
            'shipment_reminder_sent' => false,
        ], $overrides));

        $order->items()->create([
            'product_id' => $product->id,
            'product_name' => $product->name,
            'variant' => 'Standard',
            'price' => $product->price,
            'cost' => $product->cost_price,
            'quantity' => 1,
            'product_img' => null,
        ]);

        $product->decrement('stock', 1);
        $product->increment('sold', 1);

        return $order->fresh(['items', 'user', 'delivery']);
    }
}
