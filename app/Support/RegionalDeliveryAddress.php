<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Str;

class RegionalDeliveryAddress
{
    /**
     * Supported delivery provinces across Cavite and Greater Luzon (served by Lalamove).
     */
    public const SUPPORTED_PROVINCES = [
        'Cavite',
        'Metro Manila',
        'Laguna',
        'Batangas',
        'Rizal',
        'Bulacan',
        'Pampanga',
        'Bataan',
        'Tarlac',
        'Nueva Ecija',
        'Pangasinan',
        'Zambales',
        'Quezon',
    ];

    /**
     * Province alias mappings for normalized matching.
     */
    public const PROVINCE_ALIASES = [
        'ncr' => 'Metro Manila',
        'national capital region' => 'Metro Manila',
        'metro manila' => 'Metro Manila',
        'manila' => 'Metro Manila',
        'province of cavite' => 'Cavite',
        'cavite province' => 'Cavite',
        'province of laguna' => 'Laguna',
        'laguna province' => 'Laguna',
        'province of batangas' => 'Batangas',
        'batangas province' => 'Batangas',
        'province of rizal' => 'Rizal',
        'rizal province' => 'Rizal',
        'province of bulacan' => 'Bulacan',
        'bulacan province' => 'Bulacan',
        'province of pampanga' => 'Pampanga',
        'pampanga province' => 'Pampanga',
        'province of bataan' => 'Bataan',
        'bataan province' => 'Bataan',
        'province of tarlac' => 'Tarlac',
        'tarlac province' => 'Tarlac',
        'province of nueva ecija' => 'Nueva Ecija',
        'nueva ecija province' => 'Nueva Ecija',
        'province of pangasinan' => 'Pangasinan',
        'pangasinan province' => 'Pangasinan',
        'province of zambales' => 'Zambales',
        'zambales province' => 'Zambales',
        'province of quezon' => 'Quezon',
        'quezon province' => 'Quezon',
    ];

    /**
     * Greater Luzon Geographic Bounding Box for overland courier fulfillment.
     */
    public const GREATER_LUZON_BOUNDS = [
        'min_lat' => 13.20,
        'max_lat' => 16.50,
        'min_lng' => 119.80,
        'max_lng' => 122.20,
    ];

    /**
     * Centroid coordinates for major cities and municipalities across Greater Luzon.
     *
     * @var array<string, array{lat: float, lng: float, province: string, city: string}>
     */
    public const CITY_COORDINATES = [
        // --- Metro Manila (16 Cities + 1 Municipality) ---
        'manila' => ['lat' => 14.5995, 'lng' => 120.9842, 'province' => 'Metro Manila', 'city' => 'City of Manila'],
        'quezon city' => ['lat' => 14.6760, 'lng' => 121.0437, 'province' => 'Metro Manila', 'city' => 'Quezon City'],
        'makati' => ['lat' => 14.5547, 'lng' => 121.0244, 'province' => 'Metro Manila', 'city' => 'Makati City'],
        'taguig' => ['lat' => 14.5176, 'lng' => 121.0509, 'province' => 'Metro Manila', 'city' => 'Taguig City'],
        'pasig' => ['lat' => 14.5764, 'lng' => 121.0851, 'province' => 'Metro Manila', 'city' => 'Pasig City'],
        'mandaluyong' => ['lat' => 14.5794, 'lng' => 121.0359, 'province' => 'Metro Manila', 'city' => 'Mandaluyong City'],
        'san juan' => ['lat' => 14.6019, 'lng' => 121.0355, 'province' => 'Metro Manila', 'city' => 'San Juan City'],
        'pasay' => ['lat' => 14.5378, 'lng' => 120.9993, 'province' => 'Metro Manila', 'city' => 'Pasay City'],
        'paranaque' => ['lat' => 14.4793, 'lng' => 121.0198, 'province' => 'Metro Manila', 'city' => 'Parañaque City'],
        'las pinas' => ['lat' => 14.4445, 'lng' => 120.9939, 'province' => 'Metro Manila', 'city' => 'Las Piñas City'],
        'muntinlupa' => ['lat' => 14.4081, 'lng' => 121.0415, 'province' => 'Metro Manila', 'city' => 'Muntinlupa City'],
        'marikina' => ['lat' => 14.6507, 'lng' => 121.1029, 'province' => 'Metro Manila', 'city' => 'Marikina City'],
        'caloocan' => ['lat' => 14.6571, 'lng' => 120.9841, 'province' => 'Metro Manila', 'city' => 'Caloocan City'],
        'malabon' => ['lat' => 14.6625, 'lng' => 120.9566, 'province' => 'Metro Manila', 'city' => 'Malabon City'],
        'navotas' => ['lat' => 14.6667, 'lng' => 120.9417, 'province' => 'Metro Manila', 'city' => 'Navotas City'],
        'valenzuela' => ['lat' => 14.7011, 'lng' => 120.9830, 'province' => 'Metro Manila', 'city' => 'Valenzuela City'],
        'pateros' => ['lat' => 14.5454, 'lng' => 121.0686, 'province' => 'Metro Manila', 'city' => 'Pateros'],

        // --- Laguna ---
        'san pedro' => ['lat' => 14.3583, 'lng' => 121.0583, 'province' => 'Laguna', 'city' => 'San Pedro City'],
        'binan' => ['lat' => 14.3333, 'lng' => 121.0833, 'province' => 'Laguna', 'city' => 'Biñan City'],
        'santa rosa' => ['lat' => 14.3122, 'lng' => 121.1114, 'province' => 'Laguna', 'city' => 'Santa Rosa City'],
        'cabuyao' => ['lat' => 14.2783, 'lng' => 121.1250, 'province' => 'Laguna', 'city' => 'Cabuyao City'],
        'calamba' => ['lat' => 14.2117, 'lng' => 121.1656, 'province' => 'Laguna', 'city' => 'Calamba City'],
        'los banos' => ['lat' => 14.1706, 'lng' => 121.2431, 'province' => 'Laguna', 'city' => 'Los Baños'],
        'san pablo' => ['lat' => 14.0683, 'lng' => 121.3256, 'province' => 'Laguna', 'city' => 'San Pablo City'],
        'santa cruz' => ['lat' => 14.2817, 'lng' => 121.4158, 'province' => 'Laguna', 'city' => 'Santa Cruz'],
        'pagsanjan' => ['lat' => 14.2731, 'lng' => 121.4556, 'province' => 'Laguna', 'city' => 'Pagsanjan'],
        'bay' => ['lat' => 14.1800, 'lng' => 121.2858, 'province' => 'Laguna', 'city' => 'Bay'],

        // --- Batangas ---
        'santo tomas' => ['lat' => 14.1078, 'lng' => 121.1414, 'province' => 'Batangas', 'city' => 'Santo Tomas City'],
        'tanauan' => ['lat' => 14.0864, 'lng' => 121.1500, 'province' => 'Batangas', 'city' => 'Tanauan City'],
        'lipa' => ['lat' => 13.9419, 'lng' => 121.1644, 'province' => 'Batangas', 'city' => 'Lipa City'],
        'batangas city' => ['lat' => 13.7565, 'lng' => 121.0583, 'province' => 'Batangas', 'city' => 'Batangas City'],
        'malvar' => ['lat' => 14.0433, 'lng' => 121.1567, 'province' => 'Batangas', 'city' => 'Malvar'],
        'nasugbu' => ['lat' => 14.0767, 'lng' => 120.6319, 'province' => 'Batangas', 'city' => 'Nasugbu'],
        'lian' => ['lat' => 13.9961, 'lng' => 120.6547, 'province' => 'Batangas', 'city' => 'Lian'],
        'calatagan' => ['lat' => 13.8322, 'lng' => 120.6331, 'province' => 'Batangas', 'city' => 'Calatagan'],
        'balayan' => ['lat' => 13.9372, 'lng' => 120.7336, 'province' => 'Batangas', 'city' => 'Balayan'],
        'lemery' => ['lat' => 13.8833, 'lng' => 120.9167, 'province' => 'Batangas', 'city' => 'Lemery'],
        'taal' => ['lat' => 13.8800, 'lng' => 120.9233, 'province' => 'Batangas', 'city' => 'Taal'],
        'bauan' => ['lat' => 13.7917, 'lng' => 121.0083, 'province' => 'Batangas', 'city' => 'Bauan'],
        'san jose batangas' => ['lat' => 13.8781, 'lng' => 121.1067, 'province' => 'Batangas', 'city' => 'San Jose'],

        // --- Rizal ---
        'antipolo' => ['lat' => 14.5842, 'lng' => 121.1763, 'province' => 'Rizal', 'city' => 'Antipolo City'],
        'cainta' => ['lat' => 14.5772, 'lng' => 121.1225, 'province' => 'Rizal', 'city' => 'Cainta'],
        'taytay' => ['lat' => 14.5367, 'lng' => 121.1325, 'province' => 'Rizal', 'city' => 'Taytay'],
        'san mateo' => ['lat' => 14.6967, 'lng' => 121.1217, 'province' => 'Rizal', 'city' => 'San Mateo'],
        'rodriguez' => ['lat' => 14.7333, 'lng' => 121.1500, 'province' => 'Rizal', 'city' => 'Rodriguez (Montalban)'],
        'angono' => ['lat' => 14.5261, 'lng' => 121.1542, 'province' => 'Rizal', 'city' => 'Angono'],
        'binangonan' => ['lat' => 14.4644, 'lng' => 121.1925, 'province' => 'Rizal', 'city' => 'Binangonan'],
        'tanay' => ['lat' => 14.4967, 'lng' => 121.2858, 'province' => 'Rizal', 'city' => 'Tanay'],

        // --- Bulacan ---
        'san jose del monte' => ['lat' => 14.8139, 'lng' => 121.0453, 'province' => 'Bulacan', 'city' => 'San Jose del Monte City'],
        'meycauayan' => ['lat' => 14.7381, 'lng' => 120.9592, 'province' => 'Bulacan', 'city' => 'Meycauayan City'],
        'marilao' => ['lat' => 14.7578, 'lng' => 120.9481, 'province' => 'Bulacan', 'city' => 'Marilao'],
        'bocaue' => ['lat' => 14.7986, 'lng' => 120.9308, 'province' => 'Bulacan', 'city' => 'Bocaue'],
        'santa maria' => ['lat' => 14.8194, 'lng' => 120.9606, 'province' => 'Bulacan', 'city' => 'Santa Maria'],
        'malolos' => ['lat' => 14.8528, 'lng' => 120.8161, 'province' => 'Bulacan', 'city' => 'Malolos City'],
        'baliuag' => ['lat' => 14.9536, 'lng' => 120.9011, 'province' => 'Bulacan', 'city' => 'Baliwag City'],
        'plaridel' => ['lat' => 14.8872, 'lng' => 120.8572, 'province' => 'Bulacan', 'city' => 'Plaridel'],

        // --- Pampanga ---
        'san fernando pampanga' => ['lat' => 15.0340, 'lng' => 120.6847, 'province' => 'Pampanga', 'city' => 'City of San Fernando'],
        'angeles' => ['lat' => 15.1450, 'lng' => 120.5887, 'province' => 'Pampanga', 'city' => 'Angeles City'],
        'mabalacat' => ['lat' => 15.2167, 'lng' => 120.5833, 'province' => 'Pampanga', 'city' => 'Mabalacat City'],
        'guagua' => ['lat' => 14.9667, 'lng' => 120.6333, 'province' => 'Pampanga', 'city' => 'Guagua'],
        'lubao' => ['lat' => 14.9333, 'lng' => 120.6000, 'province' => 'Pampanga', 'city' => 'Lubao'],

        // --- Bataan ---
        'balanga' => ['lat' => 14.6800, 'lng' => 120.5400, 'province' => 'Bataan', 'city' => 'Balanga City'],
        'mariveles' => ['lat' => 14.4333, 'lng' => 120.4833, 'province' => 'Bataan', 'city' => 'Mariveles'],

        // --- Tarlac ---
        'tarlac city' => ['lat' => 15.4802, 'lng' => 120.5979, 'province' => 'Tarlac', 'city' => 'Tarlac City'],

        // --- Nueva Ecija ---
        'cabanatuan' => ['lat' => 15.4858, 'lng' => 120.9669, 'province' => 'Nueva Ecija', 'city' => 'Cabanatuan City'],
        'gapan' => ['lat' => 15.3083, 'lng' => 120.9472, 'province' => 'Nueva Ecija', 'city' => 'Gapan City'],

        // --- Pangasinan ---
        'dagupan' => ['lat' => 16.0433, 'lng' => 120.3333, 'province' => 'Pangasinan', 'city' => 'Dagupan City'],

        // --- Quezon ---
        'lucena' => ['lat' => 13.9314, 'lng' => 121.6167, 'province' => 'Quezon', 'city' => 'Lucena City'],
        'tayabas' => ['lat' => 14.0258, 'lng' => 121.5939, 'province' => 'Quezon', 'city' => 'Tayabas City'],
        'sariaya' => ['lat' => 13.9667, 'lng' => 121.5250, 'province' => 'Quezon', 'city' => 'Sariaya'],
        'candelaria' => ['lat' => 13.9306, 'lng' => 121.4233, 'province' => 'Quezon', 'city' => 'Candelaria'],
        'tiaong' => ['lat' => 13.9606, 'lng' => 121.3247, 'province' => 'Quezon', 'city' => 'Tiaong'],
    ];

    /**
     * Cached sorted city coordinates (longest key first).
     *
     * @var array<string, array{lat: float, lng: float, province: string, city: string}>|null
     */
    private static ?array $sortedCityCoordinates = null;

    /**
     * Check if a province/region string is in the supported delivery area.
     */
    public static function isSupportedDeliveryProvince(?string $province): bool
    {
        if ($province === null || trim($province) === '') {
            return false;
        }

        $normalized = self::normalize($province);

        if (isset(self::PROVINCE_ALIASES[$normalized])) {
            return true;
        }

        foreach (self::SUPPORTED_PROVINCES as $supported) {
            if (self::normalize($supported) === $normalized) {
                return true;
            }
        }

        return false;
    }

    /**
     * Canonicalize province name from aliases or standard inputs.
     */
    public static function canonicalizeProvince(?string $province): string
    {
        if ($province === null || trim($province) === '') {
            return CaviteAddress::PROVINCE;
        }

        $normalized = self::normalize($province);

        if (isset(self::PROVINCE_ALIASES[$normalized])) {
            return self::PROVINCE_ALIASES[$normalized];
        }

        foreach (self::SUPPORTED_PROVINCES as $supported) {
            if (self::normalize($supported) === $normalized) {
                return $supported;
            }
        }

        return trim($province);
    }

    /**
     * Check if coordinates lie within Greater Luzon delivery bounding box.
     */
    public static function isWithinDeliveryBounds(float $lat, float $lng): bool
    {
        return $lat >= self::GREATER_LUZON_BOUNDS['min_lat'] && $lat <= self::GREATER_LUZON_BOUNDS['max_lat']
            && $lng >= self::GREATER_LUZON_BOUNDS['min_lng'] && $lng <= self::GREATER_LUZON_BOUNDS['max_lng'];
    }

    /**
     * Find city/municipality centroid across Cavite and Greater Luzon.
     *
     * @return array{lat: float, lng: float, city: string, province: string}|null
     */
    public static function findCityCentroid(?string $addressOrCity): ?array
    {
        if ($addressOrCity === null || trim($addressOrCity) === '') {
            return null;
        }

        $normalized = self::normalize($addressOrCity);

        // 1. Check Cavite first
        $caviteKey = CaviteAddress::findCaviteCityInAddress($addressOrCity);
        if ($caviteKey && isset(CaviteAddress::CITY_COORDINATES[$caviteKey])) {
            $coords = CaviteAddress::CITY_COORDINATES[$caviteKey];
            $canonical = CaviteAddress::resolveCanonicalCity($caviteKey) ?? ucfirst($caviteKey);
            return [
                'lat' => $coords['lat'],
                'lng' => $coords['lng'],
                'city' => $canonical,
                'province' => CaviteAddress::PROVINCE,
            ];
        }

        // 2. Check Greater Luzon cities sorted by key length descending (prevents multi-word collisions)
        if (self::$sortedCityCoordinates === null) {
            $sorted = self::CITY_COORDINATES;
            uksort($sorted, static fn(string $a, string $b) => strlen($b) <=> strlen($a));
            self::$sortedCityCoordinates = $sorted;
        }

        foreach (self::$sortedCityCoordinates as $cityKey => $entry) {
            // For Manila, ensure it does not mistakenly match the province name 'Metro Manila'
            if ($cityKey === 'manila') {
                $pattern = '/(?<!metro\s)\bmanila\b/i';
            } else {
                $pattern = '/\b' . preg_quote($cityKey, '/') . '\b/i';
            }

            if (preg_match($pattern, $normalized)) {
                return [
                    'lat' => $entry['lat'],
                    'lng' => $entry['lng'],
                    'city' => $entry['city'],
                    'province' => $entry['province'],
                ];
            }
        }

        return null;
    }

    /**
     * Resolve approximate coordinates for any supported city/municipality.
     *
     * @return array{lat: float, lng: float}|null
     */
    public static function getCityCoordinates(?string $city): ?array
    {
        $centroid = self::findCityCentroid($city);
        if ($centroid) {
            return ['lat' => $centroid['lat'], 'lng' => $centroid['lng']];
        }

        return null;
    }

    /**
     * Normalize text for fuzzy accent-insensitive and suffix-tolerant matching.
     */
    public static function normalize(?string $value): string
    {
        $cleaned = trim((string) $value);
        if ($cleaned === '') {
            return '';
        }

        return Str::of($cleaned)
            ->replace(['ñ', 'Ñ', 'Ã±', 'Ã‘'], 'n')
            ->ascii()
            ->lower()
            ->replaceMatches('/,\s*philippines\s*$/i', '')
            ->replaceMatches('/^(?:city|municipality)\s+of\s+/i', '')
            ->replaceMatches('/\s+(?:city|municipality)$/i', '')
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->value();
    }
}
