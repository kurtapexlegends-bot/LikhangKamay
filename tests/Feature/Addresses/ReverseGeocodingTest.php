<?php

declare(strict_types=1);

namespace Tests\Feature\Addresses;

use App\Services\AddressGeocodingService;
use App\Support\CaviteAddress;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class ReverseGeocodingTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_reverse_geocode_endpoint_resolves_cavite_address_via_post(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/reverse*' => Http::response([
                'display_name' => 'Aguinaldo Highway, Salitran II, Dasmariñas, Cavite, Calabarzon, 4114, Philippines',
                'address' => [
                    'road' => 'Aguinaldo Highway',
                    'house_number' => '123',
                    'suburb' => 'Salitran II',
                    'city' => 'Dasmariñas',
                    'county' => 'Cavite',
                    'state' => 'Calabarzon',
                    'postcode' => '4114',
                    'country' => 'Philippines',
                ],
            ], 200),
        ]);

        $response = $this->postJson(route('api.geocode.reverse'), [
            'latitude' => 14.3294,
            'longitude' => 120.9367,
        ]);

        $response->assertOk();
        $response->assertJson([
            'is_within_cavite' => true,
            'street_address' => '123 Aguinaldo Highway',
            'barangay' => 'Salitran II',
            'city' => 'Dasmariñas City',
            'province' => 'Cavite',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'latitude' => 14.3294,
            'longitude' => 120.9367,
            'warning' => null,
        ]);
    }

    public function test_reverse_geocode_endpoint_resolves_via_get(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/reverse*' => Http::response([
                'display_name' => 'Tagaytay-Nasugbu Highway, Maharlika East, Tagaytay, Cavite, Philippines',
                'address' => [
                    'road' => 'Tagaytay-Nasugbu Highway',
                    'quarter' => 'Maharlika East',
                    'town' => 'Tagaytay',
                    'county' => 'Cavite',
                ],
            ], 200),
        ]);

        $response = $this->getJson(route('api.geocode.reverse', [
            'latitude' => 14.1153,
            'longitude' => 120.9621,
        ]));

        $response->assertOk();
        $response->assertJson([
            'is_within_cavite' => true,
            'city' => 'Tagaytay City',
            'barangay' => 'Maharlika East',
            'postal_code' => '4120',
            'warning' => null,
        ]);
    }

    public function test_reverse_geocode_detects_outside_cavite_location(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/reverse*' => Http::response([
                'display_name' => 'Ayala Avenue, San Lorenzo, Makati, Metro Manila, 1223, Philippines',
                'address' => [
                    'road' => 'Ayala Avenue',
                    'suburb' => 'San Lorenzo',
                    'city' => 'Makati',
                    'province' => 'Metro Manila',
                    'postcode' => '1223',
                ],
            ], 200),
        ]);

        $response = $this->postJson(route('api.geocode.reverse'), [
            'latitude' => 14.5547,
            'longitude' => 121.0244,
        ]);

        $response->assertOk();
        $response->assertJson([
            'is_within_cavite' => false,
            'city' => 'Makati',
            'street_address' => 'Ayala Avenue',
        ]);
        $this->assertNotNull($response->json('warning'));
    }

    public function test_reverse_geocode_falls_back_defensively_when_nominatim_fails(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/reverse*' => Http::response(null, 500),
        ]);

        $response = $this->postJson(route('api.geocode.reverse'), [
            'latitude' => 14.3294,
            'longitude' => 120.9367,
        ]);

        $response->assertOk();
        $response->assertJson([
            'is_within_cavite' => true,
            'city' => 'Dasmariñas City',
            'region' => 'Cavite',
            'postal_code' => '4114',
            'warning' => null,
        ]);
    }

    public function test_reverse_geocode_caches_results(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/reverse*' => Http::sequence()
                ->push([
                    'display_name' => 'First Response',
                    'address' => [
                        'road' => 'First Street',
                        'city' => 'Bacoor',
                        'county' => 'Cavite',
                    ],
                ], 200)
                ->push([
                    'display_name' => 'Second Response',
                    'address' => [
                        'road' => 'Second Street',
                        'city' => 'Bacoor',
                        'county' => 'Cavite',
                    ],
                ], 200),
        ]);

        $first = $this->postJson(route('api.geocode.reverse'), [
            'latitude' => 14.4624,
            'longitude' => 120.9645,
        ]);
        $first->assertOk();
        $this->assertSame('First Street', $first->json('street_address'));

        // Second call with same coordinates should hit Cache and NOT call Nominatim again
        $second = $this->postJson(route('api.geocode.reverse'), [
            'latitude' => 14.4624,
            'longitude' => 120.9645,
        ]);
        $second->assertOk();
        $this->assertSame('First Street', $second->json('street_address'));

        Http::assertSentCount(1);
    }

    public function test_reverse_geocode_validates_inputs(): void
    {
        $response = $this->postJson(route('api.geocode.reverse'), [
            'latitude' => 999, // out of range
            'longitude' => 120.9367,
        ]);

        $response->assertStatus(422);
        $response->assertJsonValidationErrors(['latitude']);
    }

    public function test_cavite_address_helpers(): void
    {
        // Bounds
        $this->assertTrue(CaviteAddress::isWithinCaviteBounds(14.3294, 120.9367));
        $this->assertFalse(CaviteAddress::isWithinCaviteBounds(10.0, 125.0));

        // Postal codes
        $this->assertSame('4114', CaviteAddress::getPostalCodeForCity('Dasmariñas City'));
        $this->assertSame('4120', CaviteAddress::getPostalCodeForCity('Tagaytay'));
        $this->assertSame('4107', CaviteAddress::getPostalCodeForCity('General Trias'));
        $this->assertNull(CaviteAddress::getPostalCodeForCity('Quezon City'));

        // Barangays
        $dasmaBarangays = CaviteAddress::getBarangaysForCity('Dasmariñas City');
        $this->assertContains('Salitran II', $dasmaBarangays);
        $this->assertContains('San Miguel I', $dasmaBarangays);

        // Canonical barangay resolution with Roman numerals across various cities
        $this->assertSame('Salitran II', CaviteAddress::resolveCanonicalBarangay('Dasmariñas City', 'Barangay Salitran 2'));
        $this->assertSame('Salitran II', CaviteAddress::resolveCanonicalBarangay('Dasmariñas City', 'Salitran II'));
        $this->assertSame('San Miguel I', CaviteAddress::resolveCanonicalBarangay('Dasmariñas City', 'Brgy. San Miguel 1'));
        $this->assertSame('Molino III', CaviteAddress::resolveCanonicalBarangay('Bacoor City', 'Molino 3'));
        $this->assertSame('Aniban II', CaviteAddress::resolveCanonicalBarangay('Bacoor City', 'Aniban 2'));
        $this->assertSame('Amaya VII', CaviteAddress::resolveCanonicalBarangay('Tanza', 'Amaya 7'));

        // Nearest city
        $nearest = CaviteAddress::getNearestCity(14.33, 120.94);
        $this->assertSame('Dasmariñas City', $nearest);

        // Province vs City Disambiguation
        $this->assertFalse(CaviteAddress::isValidCity('Cavite'));
        $this->assertNull(CaviteAddress::resolveCanonicalCity('Cavite'));
        $this->assertTrue(CaviteAddress::isValidCity('Cavite City'));
        $this->assertSame('Cavite City', CaviteAddress::resolveCanonicalCity('Cavite City'));
        $this->assertTrue(CaviteAddress::isValidCity('City of Cavite'));
        $this->assertSame('Cavite City', CaviteAddress::resolveCanonicalCity('City of Cavite'));

        // Strict Coordinate Bounding: Coords outside Cavite bounds must never be marked in Cavite
        $this->assertFalse(CaviteAddress::isCaviteLocation(10.0, 125.0, 'Cavite', 'Bacoor City'));
        $this->assertFalse(CaviteAddress::isCaviteLocation(51.5074, -0.1278, 'Cavite', 'Cavite City'));
    }

    public function test_reverse_geocode_border_location_in_laguna_detected_outside_cavite(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/reverse*' => Http::response([
                'display_name' => 'Biñan-Carmona Road, San Vicente, Biñan, Laguna, 4024, Philippines',
                'address' => [
                    'road' => 'Biñan-Carmona Road',
                    'suburb' => 'San Vicente',
                    'city' => 'Biñan',
                    'county' => 'Laguna',
                    'state' => 'Calabarzon',
                    'postcode' => '4024',
                ],
            ], 200),
        ]);

        $response = $this->getJson(route('api.geocode.reverse', [
            'latitude' => 14.3150,
            'longitude' => 121.0650,
        ]));

        $response->assertOk();
        $response->assertJson([
            'is_within_cavite' => false,
            'city' => 'Biñan',
            'province' => 'Laguna',
        ]);
        $this->assertNotNull($response->json('warning'));
    }

    public function test_reverse_geocode_handles_osm_state_calabarzon_without_county_gracefully(): void
    {
        // Tagaytay highway coordinate where OSM has state: Calabarzon and town: Tagaytay but no county
        Http::fake([
            'https://nominatim.openstreetmap.org/reverse*' => Http::response([
                'display_name' => 'Tagaytay-Calamba Road, Iruhin East, Tagaytay, Calabarzon, Philippines',
                'address' => [
                    'road' => 'Tagaytay-Calamba Road',
                    'suburb' => 'Iruhin East',
                    'town' => 'Tagaytay',
                    'state' => 'Calabarzon',
                ],
            ], 200),
        ]);

        $response = $this->getJson(route('api.geocode.reverse', [
            'latitude' => 14.1200,
            'longitude' => 120.9700,
        ]));

        $response->assertOk();
        $response->assertJson([
            'is_within_cavite' => true,
            'city' => 'Tagaytay City',
            'barangay' => 'Iruhin East',
            'province' => 'Cavite',
            'region' => 'Cavite',
            'warning' => null,
        ]);
    }

    public function test_reverse_geocode_does_not_resolve_county_cavite_to_cavite_city_in_southern_cavite(): void
    {
        // Coordinate in Alfonso (southern Cavite) where OSM returns county: Cavite but no city tag
        Http::fake([
            'https://nominatim.openstreetmap.org/reverse*' => Http::response([
                'display_name' => 'Luksuhin Road, Cavite, Calabarzon, Philippines',
                'address' => [
                    'road' => 'Luksuhin Road',
                    'county' => 'Cavite',
                    'state' => 'Calabarzon',
                ],
            ], 200),
        ]);

        $response = $this->getJson(route('api.geocode.reverse', [
            'latitude' => 14.1378,
            'longitude' => 120.8539,
        ]));

        $response->assertOk();
        $response->assertJson([
            'is_within_cavite' => true,
            'city' => 'Alfonso',
            'province' => 'Cavite',
            'warning' => null,
        ]);
        // Must NOT falsely resolve to 'Cavite City'!
        $this->assertNotSame('Cavite City', $response->json('city'));
    }

    public function test_reverse_geocode_without_csrf_via_post_succeeds(): void
    {
        Http::fake([
            'https://nominatim.openstreetmap.org/reverse*' => Http::response([
                'display_name' => 'Governor Drive, Trece Martires, Cavite, Philippines',
                'address' => [
                    'road' => 'Governor Drive',
                    'city' => 'Trece Martires',
                    'county' => 'Cavite',
                    'postcode' => '4109',
                ],
            ], 200),
        ]);

        // Simulating raw POST request without CSRF token
        $response = $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class)
            ->post('/api/geocode/reverse', [
                'latitude' => 14.2827,
                'longitude' => 120.8669,
            ]);

        $response->assertOk();
        $response->assertJson([
            'is_within_cavite' => true,
            'city' => 'Trece Martires City',
        ]);
    }

    public function test_null_island_and_zero_coordinates_are_strictly_outside_cavite(): void
    {
        // Null Island (0, 0)
        $this->assertFalse(CaviteAddress::isWithinCaviteBounds(0.0, 0.0));
        $this->assertFalse(CaviteAddress::isCaviteLocation(0.0, 0.0, 'Cavite', 'Imus City'));

        // Reverse geocoding at (0, 0) must return outside Cavite
        Http::fake([
            'https://nominatim.openstreetmap.org/reverse*' => Http::response([
                'display_name' => 'Gulf of Guinea, Atlantic Ocean',
                'address' => [],
            ], 200),
        ]);

        $response = $this->getJson(route('api.geocode.reverse', [
            'latitude' => 0.0,
            'longitude' => 0.0,
        ]));

        $response->assertOk();
        $response->assertJson([
            'is_within_cavite' => false,
        ]);
        $this->assertNotNull($response->json('warning'));
    }
}
