<?php

namespace Tests\Feature\Buyer;

use App\Actions\Consumer\GetBuyerOrders;
use App\Models\Order;
use App\Models\OrderDelivery;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class BuyerReceiptAndTrackingTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $otherBuyer;
    private User $artisan;
    private Order $order;
    private OrderDelivery $delivery;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan = User::factory()->create([
            'role' => 'artisan',
            'shop_name' => 'Bulacan Heritage Clay',
            'street_address' => '123 Artisan Way',
            'city' => 'San Jose del Monte',
            'barangay' => 'Graceville',
            'email_verified_at' => now(),
            'setup_completed_at' => now(),
            'artisan_status' => 'approved',
            'premium_tier' => 'premium',
        ]);

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Maria Clara',
            'email_verified_at' => now(),
        ]);

        $this->otherBuyer = User::factory()->create([
            'role' => 'buyer',
            'name' => 'Juan Luna',
            'email_verified_at' => now(),
        ]);

        $product = Product::factory()->create([
            'user_id' => $this->artisan->id,
            'name' => 'Terracotta Jar',
            'sku' => 'TERRA-JAR-01',
            'category' => 'Pottery',
            'price' => 850.00,
            'stock' => 15,
        ]);

        $this->order = Order::create([
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'order_number' => 'LK-ORD-TEST-99',
            'customer_name' => $this->buyer->name,
            'status' => 'Shipped',
            'payment_status' => 'paid',
            'payment_method' => 'GCash',
            'shipping_method' => 'Delivery',
            'total_amount' => 950.00,
            'merchandise_subtotal' => 850.00,
            'shipping_fee_amount' => 100.00,
            'shipping_address' => '45 Rizal St., Malolos, Bulacan',
            'shipping_latitude' => 14.8437,
            'shipping_longitude' => 120.8113,
        ]);

        OrderItem::create([
            'order_id' => $this->order->id,
            'product_id' => $product->id,
            'product_name' => 'Terracotta Jar',
            'quantity' => 1,
            'price' => 850.00,
        ]);

        $this->delivery = OrderDelivery::create([
            'order_id' => $this->order->id,
            'provider' => OrderDelivery::PROVIDER_IN_HOUSE,
            'status' => OrderDelivery::STATUS_ON_GOING,
            'driver_name' => 'Ramon Magsaysay',
            'driver_phone' => '09181234567',
            'vehicle_type' => 'Motorcycle',
            'vehicle_plate_number' => 'NC-12345',
            'current_latitude' => 14.8500,
            'current_longitude' => 120.8200,
            'heading' => 85.0,
            'speed_kph' => 32.5,
            'location_updated_at' => now(),
            'order_payload' => [
                'stops' => [
                    [
                        'name' => 'Studio',
                        'coordinates' => ['lat' => 14.8400, 'lng' => 120.8100],
                    ],
                    [
                        'name' => 'Buyer',
                        'coordinates' => ['lat' => 14.8437, 'lng' => 120.8113],
                    ],
                ],
            ],
        ]);
    }

    public function test_buyer_can_view_order_receipt(): void
    {
        $response = $this->actingAs($this->buyer)->get("/my-orders/{$this->order->id}/receipt");

        $response->assertStatus(200);
        $response->assertSee('LikhangKamay');
        $response->assertSee('LK-ORD-TEST-99');
        $response->assertSee('Terracotta Jar');
        $response->assertSee('Bulacan Heritage Clay');
    }

    public function test_buyer_receipt_with_download_flag_includes_auto_print_script(): void
    {
        $response = $this->actingAs($this->buyer)->get("/my-orders/{$this->order->id}/receipt?download=1");

        $response->assertStatus(200);
        $response->assertSee('window.print()', false);
        $response->assertSee('Save as PDF', false);
    }

    public function test_unauthorized_user_cannot_access_other_buyers_receipt(): void
    {
        $response = $this->actingAs($this->otherBuyer)->get("/my-orders/{$this->order->id}/receipt");

        $response->assertStatus(404);
    }

    public function test_buyer_can_fetch_telemetry_for_their_delivery(): void
    {
        $response = $this->actingAs($this->buyer)->getJson("/deliveries/{$this->delivery->id}/telemetry");

        $response->assertStatus(200);
        $response->assertJson([
            'delivery_id' => $this->delivery->id,
            'order_number' => $this->order->order_number,
            'status' => 'ON_GOING',
            'driver_name' => 'Ramon Magsaysay',
            'driver_phone' => '09181234567',
            'vehicle_type' => 'Motorcycle',
            'vehicle_plate_number' => 'NC-12345',
        ]);
        $response->assertJsonStructure([
            'telemetry' => [
                'latitude',
                'longitude',
                'heading',
                'speed_kph',
                'updated_at',
            ],
        ]);
    }

    public function test_other_buyer_cannot_fetch_telemetry(): void
    {
        $response = $this->actingAs($this->otherBuyer)->getJson("/deliveries/{$this->delivery->id}/telemetry");

        $response->assertStatus(403);
    }

    public function test_buyer_orders_serialization_includes_coordinates_and_telemetry(): void
    {
        $action = app(GetBuyerOrders::class);
        $orders = $action->execute($this->buyer);

        $this->assertNotEmpty($orders);
        $first = $orders->first();

        $this->assertEquals($this->order->id, $first['id']);
        $this->assertEquals(14.8437, $first['shipping_latitude']);
        $this->assertEquals(120.8113, $first['shipping_longitude']);
        $this->assertNotNull($first['receipt_url']);

        $delivery = $first['delivery'];
        $this->assertNotNull($delivery);
        $this->assertEquals($this->delivery->id, $delivery['id']);
        $this->assertEquals(14.8500, $delivery['current_latitude']);
        $this->assertEquals(120.8200, $delivery['current_longitude']);
        $this->assertEquals('Ramon Magsaysay', $delivery['driver_name']);
        $this->assertEquals(14.8400, $delivery['pickup_latitude']);
        $this->assertEquals(120.8113, $delivery['dropoff_longitude']);
    }
}
