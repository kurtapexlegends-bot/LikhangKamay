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
}
