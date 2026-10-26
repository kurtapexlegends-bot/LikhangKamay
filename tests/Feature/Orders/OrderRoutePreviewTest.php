<?php

namespace Tests\Feature\Orders;

use App\Models\Order;
use App\Models\User;
use App\Models\UserAddress;
use App\Services\AddressGeocodingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderRoutePreviewTest extends TestCase
{
    use RefreshDatabase;

    public function test_artisan_can_fetch_route_preview_for_their_order(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'city' => 'Dasmariñas',
            'street_address' => 'Aguinaldo Highway, Burol',
        ]);

        UserAddress::create([
            'user_id' => $seller->id,
            'recipient_name' => $seller->name,
            'phone_number' => '09123456789',
            'full_address' => 'Aguinaldo Highway, Dasmariñas, Cavite',
            'city' => 'Dasmariñas',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'is_default' => true,
        ]);

        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-TEST-ROUTE-1',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 500,
            'total_amount' => 500,
            'status' => 'Processing',
            'payment_method' => 'GCash',
            'payment_status' => 'paid',
            'shipping_method' => 'Delivery',
            'shipping_city' => 'Tagaytay',
            'shipping_address' => 'Aguinaldo Highway, Tagaytay, Cavite',
            'shipping_latitude' => 14.1153,
            'shipping_longitude' => 120.9621,
        ]);

        $response = $this->actingAs($seller)
            ->get(route('orders.route-preview', $order->order_number));

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'order_number' => 'ORD-TEST-ROUTE-1',
                'pickup' => [
                    'lat' => 14.3294,
                    'lng' => 120.9367,
                ],
                'dropoff' => [
                    'lat' => 14.1153,
                    'lng' => 120.9621,
                ],
            ]);

        $this->assertGreaterThan(20, $response->json('distance_km'));
        $this->assertNotNull($response->json('vehicle.type'));
        $this->assertIsArray($response->json('route.coordinates'));
        $this->assertNotEmpty($response->json('route.coordinates'));
    }

    public function test_route_preview_geocodes_unpinned_order_via_nominatim_service(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'city' => 'Dasmariñas',
            'street_address' => 'Aguinaldo Highway, Burol',
        ]);

        UserAddress::create([
            'user_id' => $seller->id,
            'recipient_name' => $seller->name,
            'phone_number' => '09123456789',
            'full_address' => 'Aguinaldo Highway, Dasmariñas, Cavite',
            'city' => 'Dasmariñas',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'is_default' => true,
        ]);

        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-TEST-ROUTE-GEOCODE',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 500,
            'total_amount' => 500,
            'status' => 'Processing',
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
            'shipping_city' => 'Bacoor',
            'shipping_address' => 'Panapaan 2, Bacoor, Cavite',
            'shipping_latitude' => null,
            'shipping_longitude' => null,
        ]);

        // Mock AddressGeocodingService to test Nominatim integration deterministically
        $mockGeo = $this->createMock(AddressGeocodingService::class);
        $mockGeo->expects($this->once())
            ->method('geocode')
            ->willReturn([
                'lat' => '14.4559',
                'lng' => '120.9542',
                'display_name' => 'Panapaan II, Bacoor, Cavite',
                'matched_query' => 'Panapaan 2, Bacoor, Cavite',
                'normalized_matched_query' => 'panapaan 2 bacoor cavite',
            ]);

        $this->app->instance(AddressGeocodingService::class, $mockGeo);

        $response = $this->actingAs($seller)
            ->get(route('orders.route-preview', $order->order_number));

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'order_number' => 'ORD-TEST-ROUTE-GEOCODE',
                'dropoff' => [
                    'lat' => 14.4559,
                    'lng' => 120.9542,
                    'is_estimated' => false,
                ],
            ]);

        // Verify coordinates were opportunistically persisted on the order
        $this->assertDatabaseHas('orders', [
            'id' => $order->id,
            'shipping_latitude' => 14.4559,
            'shipping_longitude' => 120.9542,
        ]);
    }

    public function test_artisan_cannot_access_route_preview_for_another_sellers_order(): void
    {
        $sellerA = User::factory()->artisanApproved()->create();
        $sellerB = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $sellerA->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-TEST-ROUTE-2',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 200,
            'total_amount' => 200,
            'status' => 'Processing',
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
        ]);

        $response = $this->actingAs($sellerB)
            ->get(route('orders.route-preview', $order->order_number));

        $response->assertNotFound();
    }

    public function test_unauthenticated_request_is_blocked(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-TEST-ROUTE-3',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 200,
            'total_amount' => 200,
            'status' => 'Processing',
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
        ]);

        $response = $this->get(route('orders.route-preview', $order->order_number));

        $response->assertRedirect(route('login'));
    }
}
