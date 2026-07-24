<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\Product;
use App\Models\User;
use App\Services\AddressGeocodingService;
use App\Services\CheckoutShippingService;
use App\Services\LalamoveService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use Tests\TestCase;

class LalamoveAutoCancellationTest extends TestCase
{
    use RefreshDatabase;
    use MockeryPHPUnitIntegration;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('services.lalamove.webhook_secret', 'test-webhook-secret');
    }

    public function test_booking_geocoding_uses_structured_address_without_fallback_shipping_address(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller);

        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'shipping_address' => 'RAW FALLBACK ADDRESS THAT SHOULD NOT BE USED',
            'shipping_street_address' => '456 Buyer Street',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmarinas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4115',
        ]);

        $expectedStructuredAddress = '456 Buyer Street, Burol I, Dasmarinas City, Cavite, 4115';

        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::type('array'), 'seller pickup')
            ->andReturn([
                'lat' => '14.3294',
                'lng' => '120.9367',
                'display_name' => 'Seller',
                'matched_query' => 'Seller Pickup Address',
            ]);

        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::on(function ($value) use ($expectedStructuredAddress) {
                if (is_array($value)) {
                    return in_array($expectedStructuredAddress, $value, true)
                        && !in_array('RAW FALLBACK ADDRESS THAT SHOULD NOT BE USED', $value, true);
                }
                return $value === $expectedStructuredAddress;
            }), 'buyer drop-off')
            ->andReturn([
                'lat' => '14.3330',
                'lng' => '120.9420',
                'display_name' => 'Buyer',
                'matched_query' => $expectedStructuredAddress,
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

        $response->assertRedirect(route('orders.index'));
        $this->assertNull(session('error'));
    }

    public function test_checkout_shipping_geocoding_uses_structured_address_without_fallback_shipping_address(): void
    {
        $seller = $this->createSeller();

        $oldEnv = app()->environment();
        app()['env'] = 'production';
        config()->set('services.lalamove.api_key', 'mock_key');
        config()->set('services.lalamove.api_secret', 'mock_secret');

        $destination = [
            'shipping_method' => 'Delivery',
            'shipping_address' => 'RAW FALLBACK ADDRESS THAT SHOULD NOT BE USED',
            'shipping_street_address' => '456 Buyer Street',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmarinas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4115',
        ];

        $expectedStructuredAddress = '456 Buyer Street, Burol I, Dasmarinas City, Cavite, 4115';

        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::type('array'), 'seller pickup')
            ->andReturn([
                'lat' => '14.3294',
                'lng' => '120.9367',
                'display_name' => 'Seller',
                'matched_query' => 'Seller Pickup Address',
            ]);

        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::on(function ($value) use ($expectedStructuredAddress) {
                if (is_array($value)) {
                    return in_array($expectedStructuredAddress, $value, true)
                        && !in_array('RAW FALLBACK ADDRESS THAT SHOULD NOT BE USED', $value, true);
                }
                return $value === $expectedStructuredAddress;
            }), 'buyer drop-off')
            ->andReturn([
                'lat' => '14.3330',
                'lng' => '120.9420',
                'display_name' => 'Buyer',
                'matched_query' => $expectedStructuredAddress,
            ]);

        $this->app->instance(AddressGeocodingService::class, $geocoder);

        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldReceive('createQuotation')
            ->once()
            ->andReturn([
                'quotationId' => 'qt_estimate',
                'serviceType' => 'MOTORCYCLE',
                'priceBreakdown' => ['currency' => 'PHP', 'total' => 150.00],
                'stops' => [
                    ['stopId' => 'stop_pickup'],
                    ['stopId' => 'stop_dropoff'],
                ],
            ]);
        $this->app->instance(LalamoveService::class, $lalamove);

        $shippingService = app(CheckoutShippingService::class);
        $quote = $shippingService->estimateForSeller($seller, $destination);

        $this->assertSame(150.00, $quote['amount']);
        $this->assertSame('lalamove_quote', $quote['source']);

        app()['env'] = $oldEnv;
    }

    public function test_webhook_for_terminal_delivery_failures_updates_terminal_failed_at(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller);

        $terminalStatuses = ['CANCELED', 'REJECTED', 'EXPIRED'];

        foreach ($terminalStatuses as $index => $status) {
            $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
                'status' => 'Shipped',
                'shipped_at' => now(),
            ]);

            $delivery = $order->delivery()->create([
                'provider' => OrderDelivery::PROVIDER_LALAMOVE,
                'status' => OrderDelivery::STATUS_ASSIGNING_DRIVER,
                'service_type' => 'MOTORCYCLE',
                'external_order_id' => 'llm_order_' . $status . '_' . $index,
                'quotation_id' => 'qt_' . $status . '_' . $index,
            ]);

            $payload = [
                'meta' => ['requestId' => 'webhook-' . $status . '-' . $index],
                'eventType' => 'ORDER_STATUS_CHANGED',
                'data' => [
                    'orderId' => 'llm_order_' . $status . '_' . $index,
                    'status' => $status,
                    'shareLink' => 'https://track.lalamove.test/llm_order_' . $index,
                    'priceBreakdown' => ['currency' => 'PHP', 'total' => 160.00],
                ],
            ];

            $response = $this->postJson(route('webhooks.lalamove', ['token' => 'test-webhook-secret']), $payload);
            $response->assertOk();

            $delivery->refresh();
            $this->assertSame($status, $delivery->status);
            $this->assertNotNull($delivery->terminal_failed_at);
            $this->assertSame('Courier reported a terminal delivery failure.', $delivery->failure_reason);
        }
    }

    public function test_executing_command_after_24_hours_cancels_order_restores_stock_and_refunds_non_cod(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller, stock: 5);

        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'status' => 'Shipped',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipped_at' => now()->subDays(2),
        ]);

        $product->refresh();
        $this->assertEquals(4, $product->stock);
        $this->assertEquals(0, $product->sold);

        $delivery = $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_CANCELED,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'llm_order_auto_cancel',
            'quotation_id' => 'qt_auto_cancel',
            'terminal_failed_at' => now()->subHours(25),
        ]);

        $this->artisan('orders:auto-cancel-failed-deliveries')
            ->assertSuccessful();

        $order->refresh();
        $delivery->refresh();
        $product->refresh();

        $this->assertSame('Cancelled', $order->status);
        $this->assertSame('refunded', $order->payment_status);
        $this->assertSame('return_to_sender_failed_delivery', $order->cancellation_reason);
        $this->assertNotNull($delivery->auto_cancelled_at);

        $this->assertEquals(5, $product->stock);
        $this->assertEquals(0, $product->sold);
    }

    public function test_executing_command_after_24_hours_for_cod_order_cancels_but_does_not_refund(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller, stock: 5);

        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'status' => 'Shipped',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipped_at' => now()->subDays(2),
        ]);

        $delivery = $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_CANCELED,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'llm_order_auto_cancel_cod',
            'quotation_id' => 'qt_auto_cancel_cod',
            'terminal_failed_at' => now()->subHours(25),
        ]);

        $this->artisan('orders:auto-cancel-failed-deliveries')
            ->assertSuccessful();

        $order->refresh();
        $delivery->refresh();

        $this->assertSame('Cancelled', $order->status);
        $this->assertSame('pending', $order->payment_status);
        $this->assertSame('return_to_sender_failed_delivery', $order->cancellation_reason);
        $this->assertNotNull($delivery->auto_cancelled_at);
    }

    public function test_executing_command_before_24_hours_does_not_cancel_order(): void
    {
        Mail::fake();
        Notification::fake();

        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller, stock: 5);

        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product, [
            'status' => 'Shipped',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipped_at' => now(),
        ]);

        $delivery = $order->delivery()->create([
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_CANCELED,
            'service_type' => 'MOTORCYCLE',
            'external_order_id' => 'llm_order_no_cancel',
            'quotation_id' => 'qt_no_cancel',
            'terminal_failed_at' => now()->subHours(23),
        ]);

        $this->artisan('orders:auto-cancel-failed-deliveries')
            ->assertSuccessful();

        $order->refresh();
        $delivery->refresh();
        $product->refresh();

        $this->assertSame('Shipped', $order->status);
        $this->assertSame('paid', $order->payment_status);
        $this->assertNull($delivery->auto_cancelled_at);

        $this->assertEquals(4, $product->stock);
        $this->assertEquals(0, $product->sold);
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

        return $order->fresh(['items', 'user', 'delivery']);
    }
}
