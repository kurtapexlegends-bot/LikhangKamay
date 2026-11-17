<?php

declare(strict_types=1);

namespace Tests\Feature\Addresses;

use App\Models\Product;
use App\Models\User;
use App\Support\CaviteAddress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StrictCaviteAddressValidationTest extends TestCase
{
    use RefreshDatabase;

    private User $buyer;
    private User $seller;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->buyer = User::factory()->create([
            'role' => 'buyer',
            'email' => 'buyer@test.com',
            'name' => 'Cavite Buyer',
        ]);

        $this->seller = User::factory()->artisanApproved()->create([
            'role' => 'artisan',
            'email' => 'artisan@test.com',
            'name' => 'Cavite Artisan',
            'shop_name' => 'Cavite Crafts',
            'street_address' => 'Blk 1 Lot 2',
            'barangay' => 'San Miguel I',
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'zip_code' => '4114',
            'phone_number' => '09171112222',
        ]);

        $this->product = Product::create([
            'user_id' => $this->seller->id,
            'artisan_id' => $this->seller->id,
            'name' => 'Handmade Clay Bowl',
            'sku' => 'SKU-CAVITE-1',
            'category' => 'Home Decor',
            'status' => 'Active',
            'price' => 500.00,
            'stock' => 10,
        ]);
    }

    public function test_user_can_save_valid_cavite_address(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('user-addresses.store'), [
            'label' => 'Home',
            'address_type' => 'home',
            'recipient_name' => 'Cavite Buyer',
            'phone_number' => '09171234567',
            'street_address' => 'Blk 35 Lot 18',
            'city' => 'Dasmariñas City',
            'barangay' => 'San Miguel I',
            'region' => 'Cavite',
            'postal_code' => '4114',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('user_addresses', [
            'user_id' => $this->buyer->id,
            'city' => 'Dasmariñas City',
            'barangay' => 'San Miguel I',
            'region' => 'Cavite',
            'postal_code' => '4114',
        ]);
    }

    public function test_user_cannot_save_unsupported_delivery_region_address(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('user-addresses.store'), [
            'label' => 'Home',
            'address_type' => 'home',
            'recipient_name' => 'Cavite Buyer',
            'phone_number' => '09171234567',
            'street_address' => '123 Main St',
            'city' => 'Cebu City',
            'barangay' => 'Lahug',
            'region' => 'Cebu',
            'postal_code' => '6000',
        ]);

        $response->assertSessionHasErrors(['region']);
        $this->assertDatabaseCount('user_addresses', 0);
    }

    public function test_user_can_save_greater_luzon_outside_cavite_address(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('user-addresses.store'), [
            'label' => 'Metro Manila Office',
            'address_type' => 'office',
            'recipient_name' => 'Luzon Buyer',
            'phone_number' => '09171234567',
            'street_address' => '123 Ayala Ave',
            'city' => 'Makati City',
            'barangay' => 'San Lorenzo',
            'region' => 'Metro Manila',
            'postal_code' => '1223',
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('user_addresses', [
            'user_id' => $this->buyer->id,
            'city' => 'Makati City',
            'region' => 'Metro Manila',
            'postal_code' => '1223',
        ]);
    }

    public function test_user_cannot_save_non_cavite_city_address(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('user-addresses.store'), [
            'label' => 'Home',
            'address_type' => 'home',
            'recipient_name' => 'Cavite Buyer',
            'phone_number' => '09171234567',
            'street_address' => '123 Main St',
            'city' => 'Quezon City',
            'barangay' => 'Diliman',
            'region' => 'Cavite',
            'postal_code' => '1101',
        ]);

        $response->assertSessionHasErrors(['city']);
        $this->assertDatabaseCount('user_addresses', 0);
    }

    public function test_profile_update_rejects_non_cavite_region(): void
    {
        $response = $this->actingAs($this->seller)->post(route('profile.update'), [
            'name' => 'Cavite Artisan',
            'email' => 'artisan@test.com',
            'shop_name' => 'Cavite Crafts',
            'region' => 'Batangas',
            'city' => 'Lipa City',
        ]);

        $response->assertSessionHasErrors(['region', 'city']);
    }

    public function test_checkout_rejects_unsupported_delivery_region_outside_greater_luzon(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->product->id, 'qty' => 1]],
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'recipient_name' => 'Juan Dela Cruz',
            'phone_number' => '09171234567',
            'shipping_street_address' => '123 Mango Ave',
            'shipping_barangay' => 'Lahug',
            'shipping_city' => 'Cebu City',
            'shipping_region' => 'Cebu',
            'shipping_postal_code' => '6000',
            'shipping_address_type' => 'home',
            'total' => 550.00,
        ]);

        $response->assertSessionHasErrors(['shipping_region']);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_accepts_greater_luzon_shipping_address_with_dynamic_distance_shipping_fee(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->product->id, 'qty' => 1]],
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'recipient_name' => 'Juan Dela Cruz',
            'phone_number' => '09171234567',
            'shipping_street_address' => '123 Rizal Ave',
            'shipping_barangay' => 'Poblacion',
            'shipping_city' => 'Calamba City',
            'shipping_region' => 'Laguna',
            'shipping_postal_code' => '4027',
            'shipping_address_type' => 'home',
            'total' => 700.00,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertDatabaseCount('orders', 1);

        $order = \App\Models\Order::first();
        $this->assertSame('Laguna', $order->shipping_region);
        $this->assertSame('Calamba City', $order->shipping_city);
        $this->assertGreaterThan(0, (float) $order->shipping_fee_amount);
    }

    public function test_cavite_address_support_methods(): void
    {
        $this->assertTrue(CaviteAddress::isCaviteRegion('Cavite'));
        $this->assertTrue(CaviteAddress::isCaviteRegion('province of cavite'));
        $this->assertFalse(CaviteAddress::isCaviteRegion('Metro Manila'));
        $this->assertFalse(CaviteAddress::isCaviteRegion('Rizal'));

        $this->assertTrue(CaviteAddress::isValidCity('Dasmariñas City'));
        $this->assertTrue(CaviteAddress::isValidCity('Dasmarinas'));
        $this->assertTrue(CaviteAddress::isValidCity('Bacoor'));
        $this->assertTrue(CaviteAddress::isValidCity('Silang'));
        $this->assertTrue(CaviteAddress::isValidCity('Indang'));
        $this->assertTrue(CaviteAddress::isValidCity('General Trias'));
        $this->assertFalse(CaviteAddress::isValidCity('Makati'));
        $this->assertFalse(CaviteAddress::isValidCity('Manila'));

        // Philippines bounding checks
        $this->assertTrue(CaviteAddress::isWithinPhilippinesBounds(14.3294, 120.9367)); // Cavite
        $this->assertTrue(CaviteAddress::isWithinPhilippinesBounds(7.0736, 125.6110));  // Davao
        $this->assertTrue(CaviteAddress::isWithinPhilippinesBounds(20.4485, 121.9706)); // Batanes
        $this->assertFalse(CaviteAddress::isWithinPhilippinesBounds(35.6762, 139.6503)); // Tokyo
        $this->assertFalse(CaviteAddress::isWithinPhilippinesBounds(51.5074, -0.1278));  // London
        $this->assertFalse(CaviteAddress::isWithinPhilippinesBounds(37.7749, -122.4194)); // San Francisco
    }

    public function test_user_can_save_address_with_valid_philippine_coordinates(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('user-addresses.store'), [
            'label' => 'Home',
            'address_type' => 'home',
            'recipient_name' => 'Cavite Buyer',
            'phone_number' => '09171234567',
            'street_address' => 'Blk 35 Lot 18',
            'city' => 'Dasmariñas City',
            'barangay' => 'San Miguel I',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $this->assertDatabaseHas('user_addresses', [
            'user_id' => $this->buyer->id,
            'city' => 'Dasmariñas City',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
        ]);
    }

    public function test_user_cannot_save_address_with_coordinates_outside_philippines(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('user-addresses.store'), [
            'label' => 'Home',
            'address_type' => 'home',
            'recipient_name' => 'Cavite Buyer',
            'phone_number' => '09171234567',
            'street_address' => 'Blk 35 Lot 18',
            'city' => 'Dasmariñas City',
            'barangay' => 'San Miguel I',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'latitude' => 35.6762, // Tokyo
            'longitude' => 139.6503,
        ]);

        $response->assertSessionHasErrors(['latitude', 'longitude']);
        $this->assertDatabaseCount('user_addresses', 0);
    }

    public function test_user_cannot_save_address_with_half_coordinates(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('user-addresses.store'), [
            'label' => 'Home',
            'address_type' => 'home',
            'recipient_name' => 'Cavite Buyer',
            'phone_number' => '09171234567',
            'street_address' => 'Blk 35 Lot 18',
            'city' => 'Dasmariñas City',
            'barangay' => 'San Miguel I',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'latitude' => 14.3294,
            'longitude' => null,
        ]);

        $response->assertSessionHasErrors(['longitude']);
        $this->assertDatabaseCount('user_addresses', 0);
    }

    public function test_reverse_geocode_returns_soft_fallback_warning_for_coordinates_outside_philippines(): void
    {
        $response = $this->actingAs($this->buyer)->getJson(route('api.geocode.reverse', [
            'latitude' => 35.6762,
            'longitude' => 139.6503,
        ]));

        $response->assertStatus(200);
        $this->assertFalse($response->json('is_within_cavite'));
        $this->assertStringContainsString('outside the Philippines', $response->json('warning'));
    }

    public function test_reverse_geocode_accepts_philippine_coordinates(): void
    {
        $response = $this->actingAs($this->buyer)->getJson(route('api.geocode.reverse', [
            'latitude' => 14.3294,
            'longitude' => 120.9367,
        ]));

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'is_within_cavite',
            'street_address',
            'barangay',
            'city',
            'province',
            'region',
            'postal_code',
            'latitude',
            'longitude',
        ]);
        $this->assertTrue($response->json('is_within_cavite'));
        $this->assertSame('Dasmariñas City', $response->json('city'));
    }

    public function test_checkout_rejects_delivery_when_dropoff_matches_seller_pickup_address(): void
    {
        // Seller pickup is 'Blk 1 Lot 2', 'San Miguel I', 'Dasmariñas City', 'Cavite', '4114'
        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->product->id, 'qty' => 1]],
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'recipient_name' => 'Juan Dela Cruz',
            'phone_number' => '09171234567',
            'shipping_street_address' => 'Blk 1 Lot 2',
            'shipping_barangay' => 'San Miguel I',
            'shipping_city' => 'Dasmariñas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address_type' => 'home',
            'total' => 550.00,
        ]);

        $response->assertSessionHasErrors(['shipping_address']);
        $this->assertDatabaseCount('orders', 0);
    }

    public function test_checkout_allows_pickup_when_buyer_address_is_same(): void
    {
        $pickupDate = app(\App\Services\PickupScheduleService::class)
            ->calculateEarliestPickupDate($this->seller, (int) $this->product->fresh()->lead_time)
            ->format('Y-m-d');

        // Same address but Pick Up method is valid
        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->product->id, 'qty' => 1]],
            'shipping_method' => 'Pick Up',
            'pickup_date' => $pickupDate,
            'pickup_time_slot' => '09:00 AM - 12:00 PM',
            'payment_method' => 'COD',
            'total' => 500.00,
        ]);

        $response->assertRedirect(route('my-orders.index'));
        $this->assertDatabaseCount('orders', 1);
    }
}
