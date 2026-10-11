<?php

namespace Tests\Feature\Orders;

use App\Models\User;
use App\Services\AddressGeocodingService;
use App\Services\CheckoutShippingService;
use App\Services\LalamoveService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Mockery;
use Tests\TestCase;

class CheckoutShippingServiceFallbackTest extends TestCase
{
    use RefreshDatabase;

    public function test_fallback_estimate_does_not_duplicate_geocoding_requests_on_lalamove_failure(): void
    {
        $oldEnv = app()['env'];
        app()['env'] = 'production'; // bypass shouldUseFlatFallback testing env bypass

        Config::set('services.lalamove.api_key', 'mock_key');
        Config::set('services.lalamove.api_secret', 'mock_secret');

        $seller = User::factory()->artisanApproved()->create();
        $seller->addresses()->create([
            'label' => 'Studio',
            'address_type' => 'other',
            'recipient_name' => 'Artisan Seller',
            'phone_number' => '09922933689',
            'full_address' => '123 Seller Lane, Dasmarinas City, Cavite, 4115',
            'is_default' => true,
        ]);

        $destination = [
            'shipping_method' => 'Delivery',
            'shipping_street_address' => '456 Buyer Street',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmarinas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4115',
        ];

        // Setup mock geocoder expecting only one call for pickup and one call for drop-off
        $geocoder = Mockery::mock(AddressGeocodingService::class);
        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::type('array'), 'seller pickup')
            ->andReturn([
                'lat' => '14.3294',
                'lng' => '120.9367',
                'display_name' => 'Seller',
                'matched_query' => '123 Seller Lane, Dasmarinas City, Cavite, 4115',
            ]);

        $geocoder->shouldReceive('geocode')
            ->once()
            ->with(Mockery::type('string'), 'buyer drop-off')
            ->andReturn([
                'lat' => '14.3330',
                'lng' => '120.9420',
                'display_name' => 'Buyer',
                'matched_query' => '456 Buyer Street, Burol I, Dasmarinas City, Cavite, 4115',
            ]);

        $this->app->instance(AddressGeocodingService::class, $geocoder);

        // Setup mock Lalamove service to throw exception simulating a failure
        $lalamove = Mockery::mock(LalamoveService::class);
        $lalamove->shouldReceive('createQuotation')
            ->once()
            ->andThrow(new \RuntimeException('Lalamove Service Outage'));

        $this->app->instance(LalamoveService::class, $lalamove);

        $shippingService = app(CheckoutShippingService::class);
        $quote = $shippingService->estimateForSeller($seller, $destination);

        $this->assertSame('fallback_distance', $quote['source']);
        $this->assertGreaterThan(0, $quote['amount']);

        app()['env'] = $oldEnv;
    }

    public function test_quote_shipping_returns_422_with_clear_error_when_outside_cavite(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->artisanApproved()->create();
        $product = \App\Models\Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Handmade Pot',
            'sku' => 'POT-001',
            'category' => 'Pottery',
            'price' => 200,
            'stock' => 5,
        ]);

        $response = $this->actingAs($buyer)->postJson(route('checkout.shipping-quote'), [
            'shipping_method' => 'Delivery',
            'items' => [
                ['id' => $product->id, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_street_address' => '123 Rizal Ave',
            'shipping_barangay' => 'Barangay 1',
            'shipping_city' => 'Manila',
            'shipping_region' => 'Metro Manila', // Non-Cavite!
            'shipping_postal_code' => '1000',
            'shipping_address_type' => 'home',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['shipping_region']);
        $this->assertStringContainsString('strictly within the Province of Cavite', $response->json('errors.shipping_region.0'));
    }

    public function test_quote_shipping_returns_422_when_address_is_identical_to_workshop_location(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Studio Clay',
            'street_address' => '123 Artisan Studio',
            'barangay' => 'Burol I',
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'zip_code' => '4114',
        ]);
        $seller->addresses()->create([
            'label' => 'Studio Workshop',
            'address_type' => 'other',
            'recipient_name' => 'Studio Clay',
            'phone_number' => '09171234567',
            'street_address' => '123 Artisan Studio',
            'barangay' => 'Burol I',
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'full_address' => '123 Artisan Studio, Burol I, Dasmariñas City, Cavite, 4114',
            'is_default' => true,
        ]);

        $product = \App\Models\Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Ceramic Mug',
            'sku' => 'CER-002',
            'category' => 'Ceramics',
            'price' => 300,
            'stock' => 5,
        ]);

        $response = $this->actingAs($buyer)->postJson(route('checkout.shipping-quote'), [
            'shipping_method' => 'Delivery',
            'items' => [
                ['id' => $product->id, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_street_address' => '123 Artisan Studio',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmariñas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address_type' => 'home',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['shipping_address']);
        $this->assertStringContainsString("identical to Studio Clay's studio pickup location", $response->json('errors.shipping_address.0'));
    }

    public function test_quote_shipping_calculates_successfully_when_some_items_are_deleted_or_missing(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Studio Clay',
            'street_address' => '123 Artisan Studio',
            'barangay' => 'Burol I',
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'zip_code' => '4114',
        ]);
        $seller->addresses()->create([
            'label' => 'Studio Workshop',
            'address_type' => 'other',
            'recipient_name' => 'Studio Clay',
            'phone_number' => '09171234567',
            'street_address' => '123 Artisan Studio',
            'barangay' => 'Burol I',
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'full_address' => '123 Artisan Studio, Burol I, Dasmariñas City, Cavite, 4114',
            'is_default' => true,
        ]);

        $validProduct = \App\Models\Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Ceramic Mug',
            'sku' => 'CER-003',
            'category' => 'Ceramics',
            'price' => 300,
            'stock' => 5,
        ]);

        $response = $this->actingAs($buyer)->postJson(route('checkout.shipping-quote'), [
            'shipping_method' => 'Delivery',
            'items' => [
                ['id' => 999999, 'qty' => 1, 'variant' => 'Standard'], // Missing/deleted product
                ['id' => $validProduct->id, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_street_address' => '456 Customer St',
            'shipping_barangay' => 'San Agustin 1',
            'shipping_city' => 'Dasmariñas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address_type' => 'home',
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure(['total_shipping_fee', 'groups']);
    }

    public function test_quote_shipping_returns_422_with_clear_message_when_all_items_are_missing(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);

        $response = $this->actingAs($buyer)->postJson(route('checkout.shipping-quote'), [
            'shipping_method' => 'Delivery',
            'items' => [
                ['id' => 999999, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_street_address' => '456 Customer St',
            'shipping_barangay' => 'San Agustin 1',
            'shipping_city' => 'Dasmariñas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address_type' => 'home',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['items']);
        $this->assertSame('One or more items in your cart are no longer available. Please update your cart to proceed.', $response->json('errors.items.0'));
    }

    public function test_quote_shipping_returns_clear_message_when_address_is_identical_and_pickup_is_disabled(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Studio Clay',
            'street_address' => '123 Artisan Studio',
            'barangay' => 'Burol I',
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'zip_code' => '4114',
        ]);
        $seller->addresses()->create([
            'label' => 'Studio Workshop',
            'address_type' => 'other',
            'recipient_name' => 'Studio Clay',
            'phone_number' => '09171234567',
            'street_address' => '123 Artisan Studio',
            'barangay' => 'Burol I',
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'full_address' => '123 Artisan Studio, Burol I, Dasmariñas City, Cavite, 4114',
            'is_default' => true,
        ]);

        // Disable workshop pickup for this seller
        $seller->getPickupSchedule()->update(['is_enabled' => false]);

        $product = \App\Models\Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Ceramic Mug',
            'sku' => 'CER-004',
            'category' => 'Ceramics',
            'price' => 300,
            'stock' => 5,
        ]);

        $response = $this->actingAs($buyer)->postJson(route('checkout.shipping-quote'), [
            'shipping_method' => 'Delivery',
            'items' => [
                ['id' => $product->id, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_street_address' => '123 Artisan Studio',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmariñas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address_type' => 'home',
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['shipping_address']);
        $this->assertStringContainsString("does not offer workshop pick-up; please provide a different delivery address", $response->json('errors.shipping_address.0'));
    }

    public function test_place_order_returns_clear_message_when_address_is_identical_and_pickup_is_disabled(): void
    {
        $buyer = User::factory()->create(['role' => 'buyer']);
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Studio Clay',
            'street_address' => '123 Artisan Studio',
            'barangay' => 'Burol I',
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'zip_code' => '4114',
        ]);
        $seller->addresses()->create([
            'label' => 'Studio Workshop',
            'address_type' => 'other',
            'recipient_name' => 'Studio Clay',
            'phone_number' => '09171234567',
            'street_address' => '123 Artisan Studio',
            'barangay' => 'Burol I',
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'full_address' => '123 Artisan Studio, Burol I, Dasmariñas City, Cavite, 4114',
            'is_default' => true,
        ]);

        // Disable workshop pickup for this seller
        $seller->getPickupSchedule()->update(['is_enabled' => false]);

        $product = \App\Models\Product::factory()->create([
            'user_id' => $seller->id,
            'name' => 'Ceramic Mug',
            'sku' => 'CER-005',
            'category' => 'Ceramics',
            'price' => 300,
            'stock' => 5,
        ]);

        $response = $this->actingAs($buyer)->post(route('checkout.store'), [
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'total' => 300,
            'items' => [
                ['id' => $product->id, 'qty' => 1, 'variant' => 'Standard'],
            ],
            'shipping_street_address' => '123 Artisan Studio',
            'shipping_barangay' => 'Burol I',
            'shipping_city' => 'Dasmariñas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address_type' => 'home',
        ]);

        $response->assertSessionHasErrors([
            'shipping_address' => "The delivery address is identical to Studio Clay's studio location. This workshop does not offer workshop pick-up; please provide a different delivery address.",
        ]);
    }
}
