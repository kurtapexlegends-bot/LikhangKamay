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

    public function test_buyer_can_fetch_route_preview_for_their_own_order(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'city' => 'Dasmariñas',
        ]);
        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-BUYER-ROUTE-1',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 300,
            'total_amount' => 300,
            'status' => 'Shipped',
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
            'shipping_city' => 'Imus',
            'shipping_address' => 'Nueno Ave, Imus, Cavite',
            'shipping_latitude' => 14.4296,
            'shipping_longitude' => 120.9367,
        ]);

        $response = $this->actingAs($buyer)
            ->get(route('my-orders.route-preview', $order->order_number));

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'order_number' => 'ORD-BUYER-ROUTE-1',
                'dropoff' => [
                    'lat' => 14.4296,
                    'lng' => 120.9367,
                ],
            ]);
    }

    public function test_buyer_cannot_fetch_route_preview_for_another_buyers_order(): void
    {
        $seller = User::factory()->artisanApproved()->create();
        $buyerA = User::factory()->create();
        $buyerB = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyerA->id,
            'order_number' => 'ORD-BUYER-ROUTE-ISOLATION',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 300,
            'total_amount' => 300,
            'status' => 'Shipped',
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Cavite',
        ]);

        // Buyer B attempting to preview Buyer A's order receives fallback without access to Buyer A's order number
        $response = $this->actingAs($buyerB)
            ->get(route('my-orders.route-preview', $order->order_number));

        // Returns direct coordinates fallback rather than Buyer A's order
        $this->assertNotEquals('ORD-BUYER-ROUTE-ISOLATION', $response->json('order_number') ?: '');
    }

    public function test_route_preview_includes_live_driver_telemetry_when_in_transit(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'city' => 'Dasmariñas',
        ]);
        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-LIVE-DRIVER-1',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 450,
            'total_amount' => 450,
            'status' => 'Shipped',
            'payment_method' => 'COD',
            'shipping_method' => 'Delivery',
            'shipping_city' => 'Bacoor',
            'shipping_address' => 'Bacoor, Cavite',
            'shipping_latitude' => 14.4559,
            'shipping_longitude' => 120.9542,
        ]);

        \App\Models\OrderDelivery::create([
            'order_id' => $order->id,
            'provider' => \App\Models\OrderDelivery::PROVIDER_IN_HOUSE,
            'status' => \App\Models\OrderDelivery::STATUS_ON_GOING,
            'driver_name' => 'Rico Rodriguez',
            'driver_phone' => '0917-888-9999',
            'vehicle_type' => 'Motorcycle',
            'vehicle_plate_number' => 'CAV-9876',
            'current_latitude' => 14.3500,
            'current_longitude' => 120.9400,
            'heading' => 45,
            'speed_kph' => 32,
            'location_updated_at' => now(),
        ]);

        $response = $this->actingAs($seller)
            ->get(route('orders.route-preview', $order->order_number));

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'is_delivering' => true,
                'driver' => [
                    'lat' => 14.35,
                    'lng' => 120.94,
                    'driver_name' => 'Rico Rodriguez',
                    'driver_phone' => '0917-888-9999',
                    'vehicle_type' => 'Motorcycle',
                    'vehicle_plate_number' => 'CAV-9876',
                    'heading' => 45,
                    'speed_kph' => 32,
                ],
            ]);
    }

    public function test_route_preview_resolves_driver_from_employee_relation_if_delivery_fields_null(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'city' => 'Dasmariñas',
        ]);
        $buyer = User::factory()->create();

        $employeeUser = User::factory()->create([
            'phone_number' => '0919-123-4567',
        ]);

        $employee = \App\Models\Employee::create([
            'user_id' => $seller->id,
            'employee_id' => 'EMP-001',
            'name' => 'Danilo Driver',
            'role' => 'Delivery Rider',
            'salary' => 15000,
            'join_date' => now()->toDateString(),
            'vehicle_type' => 'Sedan',
            'vehicle_plate_number' => 'SED-1122',
            'status' => 'active',
        ]);

        $employeeUser->update(['employee_id' => $employee->id]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-EMPLOYEE-FALLBACK-1',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 600,
            'total_amount' => 600,
            'status' => 'Shipped',
            'payment_method' => 'COD',
            'shipping_method' => 'Delivery',
            'shipping_city' => 'Silang',
            'shipping_address' => 'Silang, Cavite',
            'shipping_latitude' => 14.2250,
            'shipping_longitude' => 120.9750,
        ]);

        \App\Models\OrderDelivery::create([
            'order_id' => $order->id,
            'driver_employee_id' => $employee->id,
            'provider' => \App\Models\OrderDelivery::PROVIDER_IN_HOUSE,
            'status' => \App\Models\OrderDelivery::STATUS_ON_GOING,
            'driver_name' => null,
            'driver_phone' => null,
            'vehicle_type' => null,
            'vehicle_plate_number' => null,
            'current_latitude' => 14.3000,
            'current_longitude' => 120.9500,
            'location_updated_at' => now(),
        ]);

        $response = $this->actingAs($seller)
            ->get(route('orders.route-preview', $order->order_number));

        $response->assertOk()
            ->assertJson([
                'success' => true,
                'is_delivering' => true,
                'driver' => [
                    'driver_name' => 'Danilo Driver',
                    'driver_phone' => '0919-123-4567',
                    'vehicle_type' => 'Sedan',
                    'vehicle_plate_number' => 'SED-1122',
                ],
                'vehicle' => [
                    'type' => 'Sedan',
                ],
            ]);
    }

    public function test_get_telemetry_dynamically_resolves_assigned_employee_driver_details(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'city' => 'Dasmariñas',
        ]);
        $buyer = User::factory()->create();

        $employeeUser = User::factory()->create([
            'phone_number' => '0918-765-4321',
        ]);

        $employee = \App\Models\Employee::create([
            'user_id' => $seller->id,
            'employee_id' => 'EMP-002',
            'name' => 'Mario Motoman',
            'role' => 'Logistics & Driver',
            'salary' => 18000,
            'join_date' => now()->toDateString(),
            'vehicle_type' => 'Bicycle',
            'vehicle_plate_number' => 'BIKE-888',
            'status' => 'active',
        ]);

        $employeeUser->update(['employee_id' => $employee->id]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-TELEMETRY-DYNAMIC-1',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 500,
            'total_amount' => 500,
            'status' => 'Shipped',
            'payment_method' => 'COD',
            'shipping_method' => 'Delivery',
            'shipping_city' => 'Bacoor',
            'shipping_address' => 'Bacoor, Cavite',
        ]);

        $delivery = \App\Models\OrderDelivery::create([
            'order_id' => $order->id,
            'driver_employee_id' => $employee->id,
            'provider' => \App\Models\OrderDelivery::PROVIDER_IN_HOUSE,
            'status' => \App\Models\OrderDelivery::STATUS_ON_GOING,
            'driver_name' => null,
            'driver_phone' => null,
            'vehicle_type' => null,
            'vehicle_plate_number' => null,
            'current_latitude' => 14.4100,
            'current_longitude' => 120.9300,
            'location_updated_at' => now(),
        ]);

        $response = $this->actingAs($buyer)
            ->get(route('deliveries.telemetry', $delivery->id));

        $response->assertOk()
            ->assertJson([
                'delivery_id' => $delivery->id,
                'driver_name' => 'Mario Motoman',
                'driver_phone' => '0918-765-4321',
                'vehicle_type' => 'Bicycle',
                'vehicle_plate_number' => 'BIKE-888',
                'telemetry' => [
                    'latitude' => 14.41,
                    'longitude' => 120.93,
                ],
            ]);
    }

    public function test_get_buyer_orders_serializes_artisan_coordinates_and_resolved_driver_metadata(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'city' => 'Imus',
        ]);
        \App\Models\UserAddress::create([
            'user_id' => $seller->id,
            'recipient_name' => 'Artisan Shop',
            'phone_number' => '09171234567',
            'street_address' => 'Nueno Ave',
            'barangay' => 'Poblacion',
            'city' => 'Imus',
            'province' => 'Cavite',
            'region' => 'Region IV-A',
            'full_address' => 'Nueno Ave, Poblacion, Imus, Cavite',
            'is_default' => true,
            'latitude' => 14.4296,
            'longitude' => 120.9367,
        ]);
        $buyer = User::factory()->create();

        $employee = \App\Models\Employee::create([
            'user_id' => $seller->id,
            'employee_id' => 'EMP-003',
            'name' => 'Aris Rider',
            'role' => 'Logistics & Driver',
            'salary' => 16000,
            'join_date' => now()->toDateString(),
            'vehicle_type' => 'Motorcycle',
            'vehicle_plate_number' => 'CAV-3344',
            'status' => 'active',
        ]);

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-GETBUYERORDERS-1',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 750,
            'total_amount' => 750,
            'status' => 'Shipped',
            'payment_method' => 'COD',
            'shipping_method' => 'Delivery',
            'shipping_city' => 'Dasmariñas',
            'shipping_address' => 'Dasmariñas, Cavite',
            'shipping_latitude' => 14.3294,
            'shipping_longitude' => 120.9367,
        ]);

        \App\Models\OrderDelivery::create([
            'order_id' => $order->id,
            'driver_employee_id' => $employee->id,
            'provider' => \App\Models\OrderDelivery::PROVIDER_IN_HOUSE,
            'status' => \App\Models\OrderDelivery::STATUS_ON_GOING,
            'current_latitude' => 14.3800,
            'current_longitude' => 120.9350,
            'location_updated_at' => now(),
        ]);

        $action = app(\App\Actions\Consumer\GetBuyerOrders::class);
        $orders = $action->execute($buyer);

        $this->assertCount(1, $orders);
        $serialized = $orders->first();

        $this->assertEquals(14.4296, $serialized['seller_latitude']);
        $this->assertEquals(120.9367, $serialized['seller_longitude']);
        $this->assertNotNull($serialized['artisan']);
        $this->assertEquals(14.4296, $serialized['artisan']['latitude']);
        $this->assertEquals('Aris Rider', $serialized['delivery']['driver_name']);
        $this->assertEquals('CAV-3344', $serialized['delivery']['vehicle_plate_number']);
        $this->assertEquals('Motorcycle', $serialized['delivery']['vehicle_type']);
        $this->assertEquals(14.4296, $serialized['delivery']['pickup_latitude']);
        $this->assertEquals(120.9367, $serialized['delivery']['pickup_longitude']);
    }

    public function test_list_seller_orders_serializes_artisan_coordinates_for_route_preview(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'city' => 'Imus',
            'shop_name' => 'Imus Weavers',
        ]);

        \App\Models\UserAddress::create([
            'user_id' => $seller->id,
            'is_default' => true,
            'recipient_name' => 'Seller Contact',
            'phone_number' => '0917-000-1111',
            'full_address' => 'Nueno Ave, Poblacion, Imus, Cavite',
            'street_address' => 'Nueno Ave',
            'barangay' => 'Poblacion',
            'city' => 'Imus',
            'province' => 'Cavite',
            'latitude' => 14.4296,
            'longitude' => 120.9367,
        ]);

        $buyer = User::factory()->create();

        $order = Order::create([
            'artisan_id' => $seller->id,
            'user_id' => $buyer->id,
            'order_number' => 'ORD-SELLERLIST-1',
            'customer_name' => 'Buyer Test',
            'merchandise_subtotal' => 500,
            'total_amount' => 500,
            'status' => 'Shipped',
            'payment_method' => 'COD',
            'shipping_method' => 'Delivery',
            'shipping_city' => 'Bacoor',
            'shipping_address' => 'Bacoor, Cavite',
            'shipping_latitude' => 14.4600,
            'shipping_longitude' => 120.9600,
        ]);

        $action = app(\App\Actions\Seller\Orders\ListSellerOrders::class);
        $result = $action->execute($seller->id, $seller, []);

        $orders = $result['orders'] ?? $result;
        $first = is_array($orders) ? ($orders['data'][0] ?? null) : $orders->items()[0];

        $this->assertNotNull($first);
        $this->assertEquals(14.4296, $first['artisan']['latitude']);
        $this->assertEquals(120.9367, $first['artisan']['longitude']);
    }
}
