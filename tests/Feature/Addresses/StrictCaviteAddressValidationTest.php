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

    public function test_user_cannot_save_non_cavite_region_address(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('user-addresses.store'), [
            'label' => 'Home',
            'address_type' => 'home',
            'recipient_name' => 'Cavite Buyer',
            'phone_number' => '09171234567',
            'street_address' => '123 Main St',
            'city' => 'Dasmariñas City',
            'barangay' => 'San Miguel I',
            'region' => 'Laguna',
            'postal_code' => '4024',
        ]);

        $response->assertSessionHasErrors(['region']);
        $this->assertDatabaseCount('user_addresses', 0);
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

    public function test_checkout_rejects_non_cavite_shipping_address(): void
    {
        $response = $this->actingAs($this->buyer)->post(route('checkout.store'), [
            'items' => [['id' => $this->product->id, 'qty' => 1]],
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'recipient_name' => 'Juan Dela Cruz',
            'phone_number' => '09171234567',
            'shipping_street_address' => '123 Rizal Ave',
            'shipping_barangay' => 'Poblacion',
            'shipping_city' => 'Calamba',
            'shipping_region' => 'Laguna',
            'shipping_postal_code' => '4027',
            'shipping_address_type' => 'home',
            'total' => 550.00,
        ]);

        $response->assertSessionHasErrors(['shipping_region', 'shipping_city']);
        $this->assertDatabaseCount('orders', 0);
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
    }
}
