<?php

declare(strict_types=1);

namespace Tests\Feature\Logistics;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\AddressGeocodingService;
use App\Services\CheckoutShippingService;
use App\Services\LalamoveService;
use App\Services\OrderLogisticsService;
use App\Services\OrderRoutePreviewService;
use App\Support\CaviteAddress;
use App\Support\RegionalDeliveryAddress;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GreaterLuzonDynamicDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private User $artisan;
    private User $buyer;
    private Product $product;

    protected function setUp(): void
    {
        parent::setUp();

        $this->artisan = User::factory()->artisanApproved()->create([
            'name' => 'Imus Potter',
            'shop_name' => 'Imus Clayworks',
            'street_address' => '100 Nueno Ave',
            'barangay' => 'Bayan Luma I',
            'city' => 'Imus City',
            'region' => 'Cavite',
            'zip_code' => '4103',
            'phone_number' => '09171234567',
        ]);

        $this->artisan->addresses()->create([
            'label' => 'Workshop Studio',
            'address_type' => 'other',
            'recipient_name' => 'Imus Clayworks',
            'phone_number' => '09171234567',
            'street_address' => '100 Nueno Ave',
            'barangay' => 'Bayan Luma I',
            'city' => 'Imus City',
            'region' => 'Cavite',
            'postal_code' => '4103',
            'latitude' => 14.4296,
            'longitude' => 120.9367,
            'full_address' => '100 Nueno Ave, Bayan Luma I, Imus City, Cavite, 4103',
            'is_default' => true,
        ]);

        $this->buyer = User::factory()->create([
            'name' => 'QC Customer',
            'email' => 'buyer.qc@test.com',
            'phone_number' => '09189876543',
            'role' => 'buyer',
        ]);

        $this->product = Product::create([
            'user_id' => $this->artisan->id,
            'artisan_id' => $this->artisan->id,
            'name' => 'Terracotta Planter',
            'sku' => 'TC-PLANTER-01',
            'category' => 'Pottery',
            'price' => 450.00,
            'stock' => 15,
            'weight' => 2.0,
        ]);
    }

    public function test_geocoding_fallback_resolves_metro_manila_cities_without_error(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/search*' => Http::response([], 200),
        ]);

        $geocodingService = app(AddressGeocodingService::class);
        $result = $geocodingService->geocode('Unit 4B Katipunan Ave, Loyola Heights, Quezon City, Metro Manila', 'buyer drop-off');

        $this->assertNotEmpty($result['lat']);
        $this->assertNotEmpty($result['lng']);
        $this->assertSame('14.676', (string) round((float) $result['lat'], 3));
        $this->assertSame('121.044', (string) round((float) $result['lng'], 3));
        $this->assertStringContainsString('Quezon City', $result['display_name']);
        $this->assertStringContainsString('Metro Manila', $result['display_name']);
    }

    public function test_geocoding_fallback_resolves_laguna_cities_without_error(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/search*' => Http::response(null, 500),
        ]);

        $geocodingService = app(AddressGeocodingService::class);
        $result = $geocodingService->geocode('National Highway, Barangay Real, Calamba City, Laguna', 'buyer drop-off');

        $this->assertNotEmpty($result['lat']);
        $this->assertNotEmpty($result['lng']);
        $this->assertSame('14.212', (string) round((float) $result['lat'], 3));
        $this->assertSame('121.166', (string) round((float) $result['lng'], 3));
        $this->assertStringContainsString('Calamba', $result['display_name']);
        $this->assertStringContainsString('Laguna', $result['display_name']);
    }

    public function test_geocoding_fallback_resolves_pampanga_cities_without_error(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/search*' => Http::response(null, 500),
        ]);

        $geocodingService = app(AddressGeocodingService::class);
        $result = $geocodingService->geocode('MacArthur Highway, Dolores, San Fernando, Pampanga', 'buyer drop-off');

        $this->assertNotEmpty($result['lat']);
        $this->assertNotEmpty($result['lng']);
        $this->assertSame('15.034', (string) round((float) $result['lat'], 3));
        $this->assertSame('120.685', (string) round((float) $result['lng'], 3));
        $this->assertStringContainsString('San Fernando', $result['display_name']);
        $this->assertStringContainsString('Pampanga', $result['display_name']);
    }

    public function test_shipping_estimate_calculates_distance_based_fee_for_outside_cavite_destinations(): void
    {
        $shippingService = app(CheckoutShippingService::class);

        // Near delivery: Imus to Bacoor (approx 5km)
        $nearDestination = [
            'shipping_method' => 'Delivery',
            'shipping_street_address' => 'Molino Blvd',
            'shipping_barangay' => 'Molino III',
            'shipping_city' => 'Bacoor City',
            'shipping_region' => 'Cavite',
            'shipping_latitude' => 14.4624,
            'shipping_longitude' => 120.9645,
        ];

        // Mid delivery: Imus to Quezon City (approx 35km)
        $qcDestination = [
            'shipping_method' => 'Delivery',
            'shipping_street_address' => 'Katipunan Ave',
            'shipping_barangay' => 'Loyola Heights',
            'shipping_city' => 'Quezon City',
            'shipping_region' => 'Metro Manila',
            'shipping_latitude' => 14.6760,
            'shipping_longitude' => 121.0437,
        ];

        // Far delivery: Imus to San Fernando, Pampanga (approx 85km)
        $pampangaDestination = [
            'shipping_method' => 'Delivery',
            'shipping_street_address' => 'MacArthur Highway',
            'shipping_barangay' => 'Dolores',
            'shipping_city' => 'City of San Fernando',
            'shipping_region' => 'Pampanga',
            'shipping_latitude' => 15.0340,
            'shipping_longitude' => 120.6847,
        ];

        $items = [['id' => $this->product->id, 'qty' => 1, 'weight' => 2.0]];

        $nearQuote = $shippingService->estimateForSeller($this->artisan, $nearDestination, $items);
        $qcQuote = $shippingService->estimateForSeller($this->artisan, $qcDestination, $items);
        $pampangaQuote = $shippingService->estimateForSeller($this->artisan, $pampangaDestination, $items);

        $this->assertSame('fallback_distance', $nearQuote['source']);
        $this->assertSame('fallback_distance', $qcQuote['source']);
        $this->assertSame('fallback_distance', $pampangaQuote['source']);

        // Farther distances MUST yield proportionally higher shipping fees
        $this->assertGreaterThan($nearQuote['amount'], $qcQuote['amount']);
        $this->assertGreaterThan($qcQuote['amount'], $pampangaQuote['amount']);

        // Imus to QC (~35km): 69 base (3km) + ~32km * 10 = ~389
        $this->assertGreaterThan(300, $qcQuote['amount']);

        // Imus to Pampanga (~85km): 69 base (3km) + ~82km * 10 = ~889
        $this->assertGreaterThan(700, $pampangaQuote['amount']);
    }

    public function test_lalamove_booking_resolves_greater_luzon_recipient_without_error_when_nominatim_fails(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/search*' => Http::response(null, 500),
            'https://rest.sandbox.lalamove.com/v3/quotations' => Http::response([
                'data' => [
                    'quotationId' => 'QUO-LUZON-999',
                    'priceBreakdown' => [
                        'total' => '420.00',
                        'currency' => 'PHP',
                    ],
                    'stops' => [
                        ['stopId' => 'STOP-PICKUP-1'],
                        ['stopId' => 'STOP-DROPOFF-2'],
                    ],
                ],
            ], 200),
            'https://rest.sandbox.lalamove.com/v3/orders' => Http::response([
                'data' => [
                    'orderId' => 'LLM-ORD-QC-888',
                    'status' => 'ASSIGNING_DRIVER',
                    'shareLink' => 'https://track.lalamove.com/LLM-ORD-QC-888',
                ],
            ], 200),
        ]);

        $order = Order::create([
            'order_number' => 'ORD-QC-001',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => 'Metro Manila Buyer',
            'merchandise_subtotal' => 450.00,
            'shipping_fee_amount' => 420.00,
            'convenience_fee_amount' => 15.00,
            'total_amount' => 885.00,
            'status' => 'Accepted',
            'shipping_method' => 'Delivery',
            'payment_method' => 'COD',
            'payment_status' => 'pending',
            'shipping_street_address' => '123 Katipunan Ave',
            'shipping_barangay' => 'Loyola Heights',
            'shipping_city' => 'Quezon City',
            'shipping_region' => 'Metro Manila',
            'shipping_postal_code' => '1108',
            'shipping_address' => '123 Katipunan Ave, Loyola Heights, Quezon City, Metro Manila, 1108',
            'shipping_recipient_name' => 'Metro Manila Buyer',
            'shipping_contact_phone' => '09189876543',
        ]);

        $logisticsService = app(OrderLogisticsService::class);
        $delivery = $logisticsService->bookLalamoveDelivery($order, $this->artisan);

        $this->assertNotNull($delivery);
        $this->assertSame('ASSIGNING_DRIVER', $delivery->status);
        $this->assertSame('LLM-ORD-QC-888', $delivery->external_order_id);
        $this->assertSame('QUO-LUZON-999', $delivery->quotation_id);
    }

    public function test_order_route_preview_resolves_greater_luzon_coordinates_instead_of_defaulting_to_dasmarinas(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/search*' => Http::response(null, 500),
            'https://router.project-osrm.org/route/v1/*' => Http::response([
                'code' => 'Ok',
                'routes' => [
                    [
                        'geometry' => 'polyline_data',
                        'distance' => 38000,
                        'duration' => 2700,
                    ],
                ],
            ], 200),
        ]);

        $order = Order::create([
            'order_number' => 'ORD-ROUTE-QC-002',
            'user_id' => $this->buyer->id,
            'artisan_id' => $this->artisan->id,
            'customer_name' => 'Metro Manila Route Buyer',
            'merchandise_subtotal' => 450.00,
            'shipping_fee_amount' => 380.00,
            'total_amount' => 830.00,
            'status' => 'Processing',
            'shipping_method' => 'Delivery',
            'shipping_city' => 'Quezon City',
            'shipping_region' => 'Metro Manila',
            'shipping_address' => '123 Katipunan Ave, Quezon City, Metro Manila',
        ]);

        $routePreviewService = app(OrderRoutePreviewService::class);
        $preview = $routePreviewService->resolve($order, $this->artisan);

        $this->assertTrue($preview['success']);
        // Dropoff latitude must be Quezon City (~14.676), NOT Dasmariñas (14.3294)
        $this->assertSame(14.676, round($preview['dropoff']['lat'], 3));
        $this->assertSame(121.044, round($preview['dropoff']['lng'], 3));
    }
}
