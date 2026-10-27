<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\Product;
use App\Models\User;
use App\Services\AddressGeocodingService;
use App\Services\LalamoveService;
use App\Services\OrderLogisticsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Mockery;
use Mockery\Adapter\Phpunit\MockeryPHPUnitIntegration;
use Tests\TestCase;

class LalamoveBookingConcurrencyTest extends TestCase
{
    use RefreshDatabase;
    use MockeryPHPUnitIntegration;

    public function test_concurrent_booking_is_blocked_when_lock_is_held(): void
    {
        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product);

        // Pre-acquire the lock to simulate an active in-flight booking request
        $lockKey = "lalamove_booking:{$order->id}";
        $existingLock = Cache::lock($lockKey, 30);
        $this->assertTrue($existingLock->get(), 'Failed to acquire initial lock for simulation.');

        $logisticsService = app(OrderLogisticsService::class);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessage('Courier booking is already in progress for this order. Please wait a moment.');

        try {
            $logisticsService->bookLalamoveDelivery($order, $seller);
        } finally {
            $existingLock->release();
        }
    }

    public function test_controller_returns_error_flash_when_booking_is_already_in_progress(): void
    {
        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product);

        // Pre-acquire the lock
        $lockKey = "lalamove_booking:{$order->id}";
        $existingLock = Cache::lock($lockKey, 30);
        $this->assertTrue($existingLock->get());

        // Ensure Lalamove API is NEVER invoked when locked
        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldNotReceive('createOrder');
        $lalamove->shouldNotReceive('createQuotation');
        $this->app->instance(LalamoveService::class, $lalamove);

        try {
            $response = $this
                ->actingAs($seller)
                ->from(route('orders.index'))
                ->post(route('orders.lalamove.store', $order->order_number));

            $response->assertRedirect(route('orders.index'));
            $response->assertSessionHas('error', 'Courier booking is already in progress for this order. Please wait a moment.');
        } finally {
            $existingLock->release();
        }
    }

    public function test_lock_is_safely_released_on_completion_or_failure(): void
    {
        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product);

        // Force a failure during geocoding to verify finally block releases lock
        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->andThrow(new \RuntimeException('Unable to locate the seller pickup address for courier booking.'));
        $this->app->instance(AddressGeocodingService::class, $geocoder);

        $logisticsService = app(OrderLogisticsService::class);

        try {
            $logisticsService->bookLalamoveDelivery($order, $seller);
            $this->fail('Expected exception was not thrown.');
        } catch (\RuntimeException $e) {
            $this->assertStringContainsString('Unable to locate the seller pickup address', $e->getMessage());
        }

        // Lock must be free now
        $lockKey = "lalamove_booking:{$order->id}";
        $testLock = Cache::lock($lockKey, 10);
        $this->assertTrue($testLock->get(), 'Lock was not released after booking failure.');
        $testLock->release();
    }

    public function test_allows_rebooking_terminally_failed_delivery_on_shipped_order(): void
    {
        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product);
        $order->update(['status' => 'Shipped']);

        $failedDelivery = OrderDelivery::create([
            'order_id' => $order->id,
            'provider' => OrderDelivery::PROVIDER_LALAMOVE,
            'status' => OrderDelivery::STATUS_CANCELED,
            'external_order_id' => 'failed_order_old_999',
            'terminal_failed_at' => now()->subHours(2),
            'failure_reason' => 'Driver vehicle broke down',
        ]);

        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->with(Mockery::any(), 'seller pickup')
            ->andReturn([
                'lat' => '14.3294',
                'lng' => '120.9367',
                'display_name' => 'Seller Location',
                'matched_query' => '123 Seller Street, San Miguel I, Dasmarinas City, Cavite, 4115',
            ]);
        $geocoder->shouldReceive('geocode')
            ->with(Mockery::any(), 'buyer drop-off')
            ->andReturn([
                'lat' => '14.3450',
                'lng' => '120.9500',
                'display_name' => 'Buyer Location',
                'matched_query' => '456 Buyer Street, Burol I, Dasmarinas City, Cavite, 4115',
            ]);
        $this->app->instance(AddressGeocodingService::class, $geocoder);

        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldReceive('createQuotation')->once()->andReturn([
            'quotationId' => 'qt_rebook_999',
            'serviceType' => 'MOTORCYCLE',
            'stops' => [
                ['stopId' => 'stop_p'],
                ['stopId' => 'stop_d'],
            ],
            'priceBreakdown' => ['currency' => 'PHP', 'total' => 120.00],
        ]);
        $lalamove->shouldReceive('normalizePhone')->andReturn('+639171234567');
        $lalamove->shouldReceive('createOrder')->once()->andReturn([
            'orderId' => 'llm_rebooked_123',
            'status' => 'ASSIGNING_DRIVER',
            'shareLink' => 'https://track.lalamove.test/llm_rebooked_123',
            'priceBreakdown' => ['currency' => 'PHP', 'total' => 120.00],
        ]);
        $this->app->instance(LalamoveService::class, $lalamove);

        $logisticsService = app(OrderLogisticsService::class);
        $newDelivery = $logisticsService->bookLalamoveDelivery($order, $seller);

        $this->assertEquals('llm_rebooked_123', $newDelivery->external_order_id);
        $this->assertEquals('ASSIGNING_DRIVER', $newDelivery->status);
        $this->assertNull($newDelivery->terminal_failed_at);
        $this->assertNull($newDelivery->failure_reason);
        $this->assertEquals('Shipped', $order->fresh()->status);
        $this->assertEquals('llm_rebooked_123', $order->fresh()->tracking_number);
    }

    public function test_lock_release_failure_is_safely_rescued_during_booking(): void
    {
        $seller = $this->createSeller();
        $buyer = User::factory()->createOne();
        $product = $this->createProduct($seller);
        $order = $this->createAcceptedDeliveryOrder($seller, $buyer, $product);

        $mockLock = Mockery::mock(\Illuminate\Contracts\Cache\Lock::class);
        $mockLock->shouldReceive('get')->once()->andReturn(true);
        $mockLock->shouldReceive('release')->once()->andThrow(new \RuntimeException('Redis connection timeout'));

        $cacheMock = Mockery::mock(Cache::getFacadeRoot())->makePartial();
        $cacheMock->shouldReceive('lock')
            ->with("lalamove_booking:{$order->id}", 30)
            ->once()
            ->andReturn($mockLock);
        Cache::swap($cacheMock);

        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->with(Mockery::any(), 'seller pickup')
            ->andReturn([
                'lat' => '14.3294',
                'lng' => '120.9367',
                'display_name' => 'Seller Location',
                'matched_query' => '123 Seller Street, San Miguel I, Dasmarinas City, Cavite, 4115',
            ]);
        $geocoder->shouldReceive('geocode')
            ->with(Mockery::any(), 'buyer drop-off')
            ->andReturn([
                'lat' => '14.3450',
                'lng' => '120.9500',
                'display_name' => 'Buyer Location',
                'matched_query' => '456 Buyer Street, Burol I, Dasmarinas City, Cavite, 4115',
            ]);
        $this->app->instance(AddressGeocodingService::class, $geocoder);

        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldReceive('createQuotation')->once()->andReturn([
            'quotationId' => 'qt_rescue_123',
            'serviceType' => 'MOTORCYCLE',
            'stops' => [
                ['stopId' => 'stop_p'],
                ['stopId' => 'stop_d'],
            ],
            'priceBreakdown' => ['currency' => 'PHP', 'total' => 100.00],
        ]);
        $lalamove->shouldReceive('normalizePhone')->andReturn('+639171234567');
        $lalamove->shouldReceive('createOrder')->once()->andReturn([
            'orderId' => 'llm_rescue_123',
            'status' => 'ASSIGNING_DRIVER',
            'shareLink' => 'https://track.lalamove.test/llm_rescue_123',
            'priceBreakdown' => ['currency' => 'PHP', 'total' => 100.00],
        ]);
        $this->app->instance(LalamoveService::class, $lalamove);

        $logisticsService = app(OrderLogisticsService::class);

        // Should complete without throwing exception from $mockLock->release()
        $delivery = $logisticsService->bookLalamoveDelivery($order, $seller);
        $this->assertEquals('llm_rescue_123', $delivery->external_order_id);
    }

    private function createSeller(): User
    {
        return User::factory()->artisanApproved()->createOne([
            'name' => 'Seller Concurrency Test',
            'shop_name' => 'Concurrency Ceramics',
            'street_address' => '123 Seller Street',
            'barangay' => 'San Miguel I',
            'city' => 'Dasmarinas City',
            'region' => 'Cavite',
            'zip_code' => '4115',
            'phone_number' => '09171234567',
        ]);
    }

    private function createProduct(User $seller): Product
    {
        return Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'sku' => 'CONC-' . fake()->unique()->numerify('####'),
            'name' => 'Concurrency Product',
            'description' => 'Test lock behavior.',
            'category' => 'Tableware',
            'status' => 'Active',
            'price' => 500,
            'cost_price' => 300,
            'stock' => 10,
            'lead_time' => 3,
            'track_as_supply' => false,
        ]);
    }

    private function createAcceptedDeliveryOrder(User $seller, User $buyer, Product $product): Order
    {
        return Order::create([
            'order_number' => 'ORD-CONC-' . strtoupper(fake()->unique()->bothify('###??')),
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'merchandise_subtotal' => $product->price,
            'convenience_fee_amount' => 15.00,
            'platform_commission_amount' => 25.00,
            'seller_net_amount' => 475.00,
            'total_amount' => 515.00,
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
            'shipping_recipient_name' => $buyer->name,
            'shipping_contact_phone' => '09171234567',
        ]);
    }
}
