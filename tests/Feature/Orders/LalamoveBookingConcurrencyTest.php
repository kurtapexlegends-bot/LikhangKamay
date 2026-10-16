<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
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

        $logisticsService = app(OrderLogisticsService::class);

        // Force a failure during geocoding to verify finally block releases lock
        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->andReturn(null);
        $this->app->instance(AddressGeocodingService::class, $geocoder);

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
