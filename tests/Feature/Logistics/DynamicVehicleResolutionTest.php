<?php

namespace Tests\Feature\Logistics;

use App\Models\Product;
use App\Models\User;
use App\Services\VehicleTypeResolver;
use App\Services\CheckoutShippingService;
use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class DynamicVehicleResolutionTest extends TestCase
{
    use RefreshDatabase;

    private VehicleTypeResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resolver = new VehicleTypeResolver();
    }

    public function test_lightweight_items_resolve_to_motorcycle()
    {
        $seller = User::factory()->artisanApproved()->create();
        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Handmade Mug',
            'sku' => 'MUG-001',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 150,
            'weight' => 0.5,
            'stock' => 10,
        ]);

        $items = [
            ['id' => $product->id, 'qty' => 2, 'weight' => 0.5]
        ];

        $result = $this->resolver->resolveForItems($items);

        $this->assertEquals('MOTORCYCLE', $result['service_type']);
        $this->assertFalse($result['is_upgraded']);
        $this->assertEquals(1.1, $result['total_weight_kg']); // 2 * 0.5 * 1.10 = 1.1kg
        $this->assertEquals('motorcycle', $result['icon']);
    }

    public function test_heavy_items_over_twenty_kg_upgrade_to_sedan()
    {
        $seller = User::factory()->artisanApproved()->create();
        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Large Garden Planter',
            'sku' => 'PLN-001',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 1200,
            'weight' => 6.0,
            'stock' => 10,
        ]);

        $items = [
            ['id' => $product->id, 'qty' => 4, 'weight' => 6.0] // 24kg raw * 1.10 = 26.4kg
        ];

        $result = $this->resolver->resolveForItems($items);

        $this->assertEquals('SEDAN', $result['service_type']);
        $this->assertTrue($result['is_upgraded']);
        $this->assertEquals(26.4, $result['total_weight_kg']);
        $this->assertStringContainsString('exceeds the 20 kg motorcycle limit', $result['reason']);
        $this->assertEquals('car', $result['icon']);
    }

    public function test_bulk_orders_over_two_hundred_kg_upgrade_to_mpv()
    {
        $items = [
            ['id' => 99, 'qty' => 50, 'weight' => 4.0] // 200kg raw * 1.10 = 220kg
        ];

        $result = $this->resolver->resolveForItems($items);

        $this->assertEquals('MPV_300', $result['service_type']);
        $this->assertTrue($result['is_upgraded']);
        $this->assertEquals(220.0, $result['total_weight_kg']);
        $this->assertEquals('truck', $result['icon']);
    }

    public function test_wholesale_orders_over_three_hundred_kg_upgrade_to_van()
    {
        $items = [
            ['id' => 99, 'qty' => 20, 'weight' => 20.0] // 400kg raw * 1.10 = 440kg
        ];

        $result = $this->resolver->resolveForItems($items);

        $this->assertEquals('VAN_1000', $result['service_type']);
        $this->assertTrue($result['is_upgraded']);
        $this->assertEquals(440.0, $result['total_weight_kg']);
        $this->assertStringContainsString('Light Cargo Van', $result['reason']);
    }

    public function test_missing_weight_uses_category_fallback()
    {
        $seller = User::factory()->artisanApproved()->create();
        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Rustic Wooden Stool',
            'sku' => 'STOOL-001',
            'category' => 'Woodwork',
            'status' => 'Active',
            'price' => 900,
            'weight' => null, // null weight
            'stock' => 10,
        ]);

        $items = [
            ['id' => $product->id, 'qty' => 10] // Woodwork fallback: 2.5kg * 10 = 25kg * 1.10 = 27.5kg
        ];

        $result = $this->resolver->resolveForItems($items);

        $this->assertEquals('SEDAN', $result['service_type']);
        $this->assertEquals(27.5, $result['total_weight_kg']);
    }

    public function test_shipping_service_estimates_higher_fee_for_upgraded_sedan()
    {
        $seller = User::factory()->artisanApproved()->create([
            'street_address' => 'Studio 1, Silang',
            'city' => 'Silang',
            'region' => 'Cavite',
        ]);

        $shippingService = app(CheckoutShippingService::class);

        $lightItems = [['id' => 1, 'qty' => 1, 'weight' => 1.0]];
        $heavyItems = [['id' => 2, 'qty' => 10, 'weight' => 5.0]];

        $destination = [
            'shipping_method' => 'Delivery',
            'shipping_street_address' => '123 Test St',
            'shipping_city' => 'Dasmariñas City',
            'shipping_region' => 'Cavite',
        ];

        $lightQuote = $shippingService->estimateForSeller($seller, $destination, $lightItems);
        $heavyQuote = $shippingService->estimateForSeller($seller, $destination, $heavyItems);

        $this->assertEquals('MOTORCYCLE', $lightQuote['vehicle_info']['service_type']);
        $this->assertEquals('SEDAN', $heavyQuote['vehicle_info']['service_type']);
        $this->assertGreaterThan($lightQuote['amount'], $heavyQuote['amount']);
    }
}
