<?php

namespace App\Services;

use App\Support\CaviteAddress;
use App\Support\StructuredAddress;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class AddressGeocodingService
{
    public function geocode(string|array $address, string $context = 'address'): array
    {
        $seedQueries = is_array($address) ? $address : [$address];
        $seedQueries = array_values(array_filter(array_map(
            static fn ($value) => trim((string) $value),
            $seedQueries
        )));

        if (empty($seedQueries)) {
            throw new \RuntimeException('Address is required for geocoding.');
        }

        $cacheKey = 'geocode:' . md5(serialize($seedQueries));

        return Cache::remember($cacheKey, now()->addDays(30), function () use ($seedQueries, $context) {
            $startTime = microtime(true);
            $maxTotalSeconds = 4.0;
            $timeout = (int) config('services.nominatim.timeout', 3);
            $connectTimeout = (int) config('services.nominatim.connect_timeout', 1);

            foreach ($seedQueries as $seedQuery) {
                // Limit candidate attempts to the top 3 high-signal candidates to prevent Nominatim rate-limiting and timeouts
                $candidates = array_slice($this->candidateQueriesFor($seedQuery), 0, 3);

                foreach ($candidates as $candidateQuery) {
                    if ((microtime(true) - $startTime) > $maxTotalSeconds) {
                        break 2;
                    }

                    try {
                        /** @var Response $response */
                        $response = Http::acceptJson()
                            ->withUserAgent(config('app.name', 'LikhangKamay') . '/1.0 logistics')
                            ->connectTimeout($connectTimeout)
                            ->timeout($timeout)
                            ->get(config('services.nominatim.base_url', 'https://nominatim.openstreetmap.org') . '/search', [
                                'q' => $candidateQuery,
                                'format' => 'jsonv2',
                                'limit' => 1,
                                'countrycodes' => 'ph',
                            ]);

                        if ($response->successful()) {
                            $result = $response->json();

                            if (is_array($result) && !empty($result[0]['lat']) && !empty($result[0]['lon'])) {
                                return [
                                    'lat' => (string) $result[0]['lat'],
                                    'lng' => (string) $result[0]['lon'],
                                    'display_name' => (string) ($result[0]['display_name'] ?? $candidateQuery),
                                    'matched_query' => $candidateQuery,
                                    'normalized_matched_query' => StructuredAddress::normalizeForComparison($candidateQuery),
                                ];
                            }
                        }
                    } catch (\Throwable) {
                        // Suppress connection/timeout errors per candidate and proceed to next candidate or fallback
                    }
                }
            }

            throw new \RuntimeException("Unable to locate the {$context} address for courier booking.");
        });
    }

    /**
     * @return array<int, string>
     */
    private function candidateQueriesFor(string $query): array
    {
        $candidates = [];
        $seen = [];

        $pushCandidate = static function (?string $value) use (&$candidates, &$seen): void {
            $value = trim((string) $value, " \t\n\r\0\x0B,");

            if ($value === '') {
                return;
            }

            $fingerprint = Str::lower(Str::ascii($value));

            if ($fingerprint === '' || isset($seen[$fingerprint])) {
                return;
            }

            $seen[$fingerprint] = true;
            $candidates[] = $value;
        };

        $normalizedQuery = preg_replace('/\s+/', ' ', trim($query));
        $normalizedQuery = $normalizedQuery === null ? trim($query) : trim($normalizedQuery);
        $cleanPostal = $this->stripTrailingPostalCode($normalizedQuery);
        $microStripped = $this->stripMicroAddressPrefix($cleanPostal);
        $romanNormalized = $this->normalizeRomanNumeralsInBarangay($microStripped);

        // 1. High-precision clean variants without Philippine subdivision micro-prefixes (Blk/Lot/Unit)
        if ($microStripped !== '' && $microStripped !== $cleanPostal) {
            $pushCandidate($microStripped);
            if ($romanNormalized !== $microStripped) {
                $pushCandidate($romanNormalized);
            }
            $pushCandidate($this->withCityAliases($microStripped));
            if (!str_contains(Str::lower($microStripped), 'philippines')) {
                $pushCandidate("{$microStripped}, Philippines");
            }
        }

        // 2. Full clean address without postal code
        $pushCandidate($cleanPostal);
        $pushCandidate($this->withCityAliases($cleanPostal));

        // 3. Comma-separated suffixes (e.g. Barangay + City)
        $commaParts = array_values(array_filter(array_map('trim', explode(',', $cleanPostal))));
        $partCount = count($commaParts);
        for ($startIndex = 1; $startIndex < $partCount; $startIndex++) {
            $suffix = implode(', ', array_slice($commaParts, $startIndex));
            $suffix = $this->stripTrailingPostalCode($suffix);
            $suffixMicro = $this->stripMicroAddressPrefix($suffix);

            if ($suffixMicro === '') {
                continue;
            }

            $pushCandidate($suffixMicro);
            $pushCandidate($this->normalizeRomanNumeralsInBarangay($suffixMicro));

            if (!str_contains(Str::lower($suffixMicro), 'philippines')) {
                $pushCandidate("{$suffixMicro}, Philippines");
            }
        }

        return $candidates;
    }

    private function stripMicroAddressPrefix(?string $query): string
    {
        $query = trim((string) $query);
        if ($query === '') {
            return '';
        }

        // Strip micro-prefixes: Blk 35 Lot 17, Block 3 Lot 4, Lot 5, Phase 2, Unit 10, Rm 1, #123, etc.
        $pattern = '/^(?:(?:blk|block)\s*[\w\d-]+(?:\s*(?:lot|lt)\s*[\w\d-]+)?|(?:lot|lt)\s*[\w\d-]+|phase\s*[\w\d-]+|unit\s*[\w\d-]+|rm\s*[\w\d-]+|room\s*[\w\d-]+|#\s*[\w\d-]+)\s*,\s*/i';
        $cleaned = preg_replace($pattern, '', $query);
        if ($cleaned !== null && $cleaned !== $query) {
            $cleaned = preg_replace($pattern, '', $cleaned);
        }

        return trim($cleaned ?? $query, " \t\n\r\0\x0B,");
    }

    private function normalizeRomanNumeralsInBarangay(?string $query): string
    {
        $query = trim((string) $query);
        if ($query === '') {
            return '';
        }

        $romanMap = [
            '/\b(San\s+\w+|Barangay|Brgy\.?|Poblacion|Zone|Salitran|Paliparan|Sampaloc)\s+I\b/i' => '$1 1',
            '/\b(San\s+\w+|Barangay|Brgy\.?|Poblacion|Zone|Salitran|Paliparan|Sampaloc)\s+II\b/i' => '$1 2',
            '/\b(San\s+\w+|Barangay|Brgy\.?|Poblacion|Zone|Salitran|Paliparan|Sampaloc)\s+III\b/i' => '$1 3',
            '/\b(San\s+\w+|Barangay|Brgy\.?|Poblacion|Zone|Salitran|Paliparan|Sampaloc)\s+IV\b/i' => '$1 4',
            '/\b(San\s+\w+|Barangay|Brgy\.?|Poblacion|Zone|Salitran|Paliparan|Sampaloc)\s+V\b/i' => '$1 5',
        ];

        return preg_replace(array_keys($romanMap), array_values($romanMap), $query) ?? $query;
    }

    private function stripTrailingPostalCode(?string $query): string
    {
        $query = trim((string) $query);

        if ($query === '') {
            return '';
        }

        $stripped = preg_replace('/,\s*\d{4,5}\s*$/', '', $query);

        return trim($stripped === null ? $query : $stripped, " \t\n\r\0\x0B,");
    }

    private function withCityAliases(?string $query): string
    {
        $query = trim((string) $query);

        if ($query === '') {
            return '';
        }

        return str_ireplace(
            ['Dasmarinas City', 'Dasmarinas'],
            ['Dasmariñas City', 'Dasmariñas'],
            $query
        );
    }

    /**
     * Reverse geocode coordinates using OpenStreetMap Nominatim with caching and Cavite normalization
     *
     * @return array{
     *     is_within_cavite: bool,
     *     street_address: string,
     *     barangay: string,
     *     city: string,
     *     province: string,
     *     region: string,
     *     postal_code: string,
     *     latitude: float,
     *     longitude: float,
     *     display_name: string,
     *     warning: ?string
     * }
     */
    public function reverseGeocode(float $latitude, float $longitude): array
    {
        $lat = round($latitude, 7);
        $lng = round($longitude, 7);
        $cacheLat = round($latitude, 5);
        $cacheLng = round($longitude, 5);
        $cacheKey = "geocode:reverse:{$cacheLat}_{$cacheLng}";

        return Cache::remember($cacheKey, now()->addDays(30), function () use ($lat, $lng) {
            $timeout = (int) config('services.nominatim.timeout', 3);
            $connectTimeout = (int) config('services.nominatim.connect_timeout', 1);
            $baseUrl = config('services.nominatim.base_url', 'https://nominatim.openstreetmap.org');

            $rawAddress = [];
            $displayName = '';

            try {
                /** @var Response $response */
                $response = Http::acceptJson()
                    ->withUserAgent(config('app.name', 'LikhangKamay') . '/1.0 logistics reverse-geocoding')
                    ->connectTimeout($connectTimeout)
                    ->timeout($timeout)
                    ->get($baseUrl . '/reverse', [
                        'lat' => $lat,
                        'lon' => $lng,
                        'format' => 'jsonv2',
                        'addressdetails' => 1,
                        'zoom' => 18,
                    ]);

                if ($response->successful()) {
                    $result = $response->json();
                    if (is_array($result)) {
                        $rawAddress = (array) ($result['address'] ?? []);
                        $displayName = (string) ($result['display_name'] ?? '');
                    }
                }
            } catch (\Throwable) {
                // Suppress Nominatim network/timeout exceptions and fallback gracefully
            }

            return $this->formatReverseGeocodedPayload($lat, $lng, $rawAddress, $displayName);
        });
    }

    /**
     * Parse and normalize Philippine and Cavite address details into canonical structure
     *
     * @param array<string, mixed> $rawAddress
     * @return array{
     *     is_within_cavite: bool,
     *     street_address: string,
     *     barangay: string,
     *     city: string,
     *     province: string,
     *     region: string,
     *     postal_code: string,
     *     latitude: float,
     *     longitude: float,
     *     display_name: string,
     *     warning: ?string
     * }
     */
    private function formatReverseGeocodedPayload(float $lat, float $lng, array $rawAddress, string $displayName): array
    {
        // 1. Street / Road & POI
        $street = trim((string) ($rawAddress['road'] ?? $rawAddress['street'] ?? $rawAddress['pedestrian'] ?? $rawAddress['residential'] ?? $rawAddress['footway'] ?? $rawAddress['path'] ?? ''));
        $houseNumber = trim((string) ($rawAddress['house_number'] ?? ''));
        $poi = trim((string) ($rawAddress['amenity'] ?? $rawAddress['shop'] ?? $rawAddress['office'] ?? $rawAddress['building'] ?? $rawAddress['tourism'] ?? $rawAddress['historic'] ?? ''));

        if ($houseNumber !== '' && $street !== '') {
            $streetAddress = "{$houseNumber} {$street}";
        } elseif ($poi !== '' && $street !== '') {
            $streetAddress = "{$poi}, {$street}";
        } elseif ($street !== '') {
            $streetAddress = $street;
        } elseif ($poi !== '') {
            $streetAddress = $poi;
        } else {
            $streetAddress = $houseNumber;
        }

        // 2. Raw Barangay candidates
        $rawBarangay = trim((string) (
            $rawAddress['quarter']
            ?? $rawAddress['suburb']
            ?? $rawAddress['village']
            ?? $rawAddress['neighbourhood']
            ?? $rawAddress['barangay']
            ?? $rawAddress['city_district']
            ?? ''
        ));

        // 3. Raw City candidates (CRITICAL: Never include 'county' as city!)
        $rawCityCandidates = array_values(array_filter([
            trim((string) ($rawAddress['city'] ?? '')),
            trim((string) ($rawAddress['municipality'] ?? '')),
            trim((string) ($rawAddress['town'] ?? '')),
            trim((string) ($rawAddress['city_district'] ?? '')),
        ], static fn ($val) => $val !== ''));

        // 4. Raw Province and Region candidates
        $rawProvince = trim((string) (
            $rawAddress['county']
            ?? $rawAddress['province']
            ?? $rawAddress['state_district']
            ?? ''
        ));

        $rawRegion = trim((string) (
            $rawAddress['state']
            ?? $rawAddress['region']
            ?? ''
        ));

        // If no explicit province is given but region is Metro Manila, set province to Metro Manila
        if ($rawProvince === '' && str_contains(strtolower($rawRegion), 'manila')) {
            $rawProvince = 'Metro Manila';
        }

        // 5. Postal code
        $rawPostalCode = trim((string) ($rawAddress['postcode'] ?? $rawAddress['postal_code'] ?? ''));

        // 6. Match canonical Cavite city if possible
        $matchedCity = null;
        foreach ($rawCityCandidates as $candidate) {
            if (CaviteAddress::isValidCity($candidate)) {
                $matchedCity = CaviteAddress::resolveCanonicalCity($candidate);
                break;
            }
        }

        // Determine if within Cavite
        $isWithinCavite = CaviteAddress::isCaviteLocation($lat, $lng, $rawProvince, $matchedCity ?? ($rawCityCandidates[0] ?? null));

        if ($isWithinCavite) {
            // If inside Cavite bounds but no city tag in OSM, fallback to nearest Cavite city
            if ($matchedCity === null) {
                $matchedCity = CaviteAddress::getNearestCity($lat, $lng);
            }

            $resolvedBarangay = CaviteAddress::resolveCanonicalBarangay($matchedCity, $rawBarangay) ?? $rawBarangay;
            $resolvedPostalCode = $rawPostalCode !== '' && preg_match('/^\d{4}$/', $rawPostalCode)
                ? $rawPostalCode
                : (CaviteAddress::getPostalCodeForCity($matchedCity) ?? $rawPostalCode);

            return [
                'is_within_cavite' => true,
                'street_address' => $streetAddress,
                'barangay' => $resolvedBarangay,
                'city' => $matchedCity,
                'province' => CaviteAddress::PROVINCE,
                'region' => CaviteAddress::PROVINCE,
                'postal_code' => $resolvedPostalCode,
                'latitude' => $lat,
                'longitude' => $lng,
                'display_name' => $displayName,
                'warning' => null,
            ];
        }

        // Outside Cavite: return detected fields but flag non-Cavite with warning
        $outsideCity = $rawCityCandidates[0] ?? '';
        return [
            'is_within_cavite' => false,
            'street_address' => $streetAddress,
            'barangay' => $rawBarangay,
            'city' => $outsideCity,
            'province' => $rawProvince !== '' ? $rawProvince : $rawRegion,
            'region' => $rawRegion !== '' ? $rawRegion : $rawProvince,
            'postal_code' => $rawPostalCode,
            'latitude' => $lat,
            'longitude' => $lng,
            'display_name' => $displayName,
            'warning' => 'The detected location is outside Cavite. LikhangKamay operations, workshops, and delivery addresses are strictly Cavite-only.',
        ];
    }
}

