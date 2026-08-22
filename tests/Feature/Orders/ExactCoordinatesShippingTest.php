<?php

namespace Tests\Feature\Orders;

use App\Actions\Consumer\PlaceOrder;
use App\Actions\Consumer\QuoteCheckoutShipping;
use App\Models\Product;
use App\Models\User;
use App\Models\UserAddress;
use App\Services\AddressGeocodingService;
use App\Services\CheckoutShippingService;
use App\Services\LalamoveService;
use App\Services\OrderFinanceService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class ExactCoordinatesShippingTest extends TestCase
{
    use RefreshDatabase;

    public function test_pinned_coordinates_bypass_nominatim_geocoding()
    {
        $oldEnv = app()['env'];
        app()['env'] = 'production';
        \Illuminate\Support\Facades\Config::set('services.lalamove.api_key', 'mock_key');
        \Illuminate\Support\Facades\Config::set('services.lalamove.api_secret', 'mock_secret');

        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Test Studio',
        ]);
        $seller->addresses()->create([
            'label' => 'Studio',
            'address_type' => 'other',
            'recipient_name' => 'Studio',
            'phone_number' => '09123456789',
            'street_address' => 'Studio Address 1',
            'barangay' => 'San Miguel I',
            'city' => 'Dasmarinas City',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'full_address' => 'Studio Address 1, San Miguel I, Dasmarinas City, Cavite, 4114',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'is_default' => true,
        ]);

        $mockGeocoding = $this->createMock(AddressGeocodingService::class);
        $mockGeocoding->expects($this->never())->method('geocode');
        $this->app->instance(AddressGeocodingService::class, $mockGeocoding);

        $mockLalamove = $this->createMock(LalamoveService::class);
        $mockLalamove->expects($this->once())
            ->method('createQuotation')
            ->with($this->callback(function ($payload) {
                return (string) data_get($payload, 'stops.0.coordinates.lat') === '14.3294'
                    && (string) data_get($payload, 'stops.0.coordinates.lng') === '120.9367'
                    && (string) data_get($payload, 'stops.1.coordinates.lat') === '14.4296'
                    && (string) data_get($payload, 'stops.1.coordinates.lng') === '120.9367';
            }))
            ->willReturn([
                'priceBreakdown' => [
                    'total' => 65.00,
                    'currency' => 'PHP',
                ],
            ]);
        $this->app->instance(LalamoveService::class, $mockLalamove);

        $service = app(CheckoutShippingService::class);

        $estimate = $service->estimateForSeller($seller, [
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Buyer Imus Address',
            'shipping_street_address' => '123 Main St',
            'shipping_barangay' => 'Bucandala I',
            'shipping_city' => 'Imus City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4103',
            'shipping_latitude' => 14.4296,
            'shipping_longitude' => 120.9367,
        ]);

        $this->assertEquals(65.00, $estimate['amount']);
        $this->assertEquals('lalamove_quote', $estimate['source']);
        app()['env'] = $oldEnv;
    }

    public function test_identical_coordinates_block_delivery_checkout()
    {
        $seller = User::factory()->artisanApproved()->create([
            'shop_name' => 'Studio Closeby',
        ]);
        $seller->addresses()->create([
            'label' => 'Studio',
            'address_type' => 'other',
            'recipient_name' => 'Studio',
            'phone_number' => '09123456789',
            'street_address' => 'Blk 1 Lot 1',
            'barangay' => 'San Miguel I',
            'city' => 'Dasmarinas City',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'full_address' => 'Blk 1 Lot 1, San Miguel I, Dasmarinas City, Cavite, 4114',
            'latitude' => 14.329400,
            'longitude' => 120.936700,
            'is_default' => true,
        ]);

        $buyer = User::factory()->create(['role' => 'buyer']);

        $product = Product::create([
            'user_id' => $seller->id,
            'artisan_id' => $seller->id,
            'name' => 'Test Ceramic Pot',
            'sku' => 'POT-001',
            'category' => 'Pottery',
            'description' => 'A handcrafted ceramic pot',
            'stock' => 10,
            'price' => 500,
            'status' => 'approved',
        ]);

        $request = new Request([
            'shipping_method' => 'Delivery',
            'shipping_address' => 'Blk 1 Lot 1, Different Subd, Dasmarinas City',
            'shipping_street_address' => 'Blk 1 Lot 1, Different Subd',
            'shipping_barangay' => 'San Miguel I',
            'shipping_city' => 'Dasmarinas City',
            'shipping_region' => 'Cavite',
            'shipping_postal_code' => '4114',
            'shipping_address_type' => 'home',
            'shipping_latitude' => 14.329405, // within ~1 meter
            'shipping_longitude' => 120.936705,
            'items' => [
                ['id' => $product->id, 'qty' => 1, 'seller_id' => $seller->id],
            ],
        ]);

        $mockGeocoding = $this->createMock(AddressGeocodingService::class);
        $mockLalamove = $this->createMock(LalamoveService::class);
        $shippingService = new CheckoutShippingService($mockGeocoding, $mockLalamove);
        $action = new QuoteCheckoutShipping($shippingService);

        $this->expectException(ValidationException::class);
        $action->execute($request, $buyer);
    }
}
