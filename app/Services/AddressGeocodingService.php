<?php

namespace App\Services;

use App\Support\StructuredAddress;
use Illuminate\Http\Client\Response;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;

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

        foreach ($seedQueries as $seedQuery) {
            foreach ($this->candidateQueriesFor($seedQuery) as $candidateQuery) {
                /** @var Response $response */
                $response = Http::acceptJson()
                    ->withUserAgent(config('app.name', 'LikhangKamay') . '/1.0 logistics')
                    ->timeout(20)
                    ->get(config('services.nominatim.base_url', 'https://nominatim.openstreetmap.org') . '/search', [
                        'q' => $candidateQuery,
                        'format' => 'jsonv2',
                        'limit' => 1,
                        'countrycodes' => 'ph',
                    ]);

                if ($response->failed()) {
                    throw new \RuntimeException('Address lookup failed. Please try again.');
                }

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
        }

        throw new \RuntimeException("Unable to locate the {$context} address for courier booking.");
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
        $asciiQuery = trim(Str::ascii($normalizedQuery));
        $commaParts = array_values(array_filter(array_map('trim', explode(',', $normalizedQuery))));

        $variants = array_filter([
            $normalizedQuery,
            $this->stripTrailingPostalCode($normalizedQuery),
            $asciiQuery,
            $this->stripTrailingPostalCode($asciiQuery),
            $this->withCityAliases($normalizedQuery),
            $this->withCityAliases($asciiQuery),
        ]);

        foreach ($variants as $variant) {
            $pushCandidate($variant);

            if (!str_contains(Str::lower($variant), 'philippines')) {
                $pushCandidate("{$variant}, Philippines");
            }
        }

        $partCount = count($commaParts);
        for ($startIndex = 1; $startIndex < $partCount; $startIndex++) {
            $suffix = implode(', ', array_slice($commaParts, $startIndex));
            $suffix = $this->stripTrailingPostalCode($suffix);

            if ($suffix === '') {
                continue;
            }

            $pushCandidate($suffix);
            $pushCandidate(Str::ascii($suffix));

            if (!str_contains(Str::lower($suffix), 'philippines')) {
                $pushCandidate("{$suffix}, Philippines");
                $pushCandidate(Str::ascii("{$suffix}, Philippines"));
            }
        }

        return $candidates;
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
}

