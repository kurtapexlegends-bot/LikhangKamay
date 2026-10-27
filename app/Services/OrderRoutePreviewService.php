<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use App\Support\CaviteAddress;
use App\Support\StructuredAddress;
use App\Services\VehicleTypeResolver;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class OrderRoutePreviewService
{
    public function __construct(
        private readonly AddressGeocodingService $geocodingService
    ) {}

    /**
     * Resolve verified delivery route coordinates, addresses, and road route details.
     *
     * @return array{
     *     success: bool,
     *     order_number: string,
     *     pickup: array{lat: float, lng: float, address: string, label: string, is_estimated: bool},
     *     dropoff: array{lat: float, lng: float, address: string, label: string, is_estimated: bool},
     *     distance_km: float,
     *     duration_mins: int,
     *     vehicle: array{type: string, label: string, icon: string},
     *     route: array{coordinates: array<int, array{0: float, 1: float}>, distance_km: float, duration_mins: int, is_road_routed: bool},
     *     is_estimated: bool
     * }
     */
    public function resolve(
        Order $order,
        User $seller,
        ?float $overrideDriverLat = null,
        ?float $overrideDriverLng = null,
        ?bool $overrideIsDelivering = null
    ): array {
        $order->loadMissing(['delivery.driverEmployee.loginAccount']);
        $pickup = $this->resolvePickup($seller);
        $dropoff = $this->resolveDropoff($order);

        // Resolve vehicle assignment
        $delivery = $order->delivery;
        $driverEmployee = $delivery?->driverEmployee;
        $vehicleType = $delivery?->vehicle_type ?: $driverEmployee?->vehicle_type;

        if ($vehicleType) {
            $vehicleLabel = $vehicleType;
            $vehicleIcon = match (strtolower($vehicleType)) {
                'motorcycle' => 'motorcycle',
                'bicycle', 'bike' => 'bike',
                'car', 'sedan' => 'car',
                default => 'truck',
            };
        } else {
            $vehicleInfo = app(VehicleTypeResolver::class)->resolveForItems($order->items);
            $vehicleLabel = $vehicleInfo['label'] ?? 'Motorcycle';
            $vehicleIcon = $vehicleInfo['icon'] ?? 'motorcycle';
            $vehicleType = $vehicleLabel;
        }

        // Determine if delivery is actively in transit
        $deliveryStatus = strtoupper((string) ($delivery?->status ?? ''));
        $isInTransitStatus = in_array($deliveryStatus, ['ON_GOING', 'PICKED_UP', 'IN_TRANSIT']);
        
        $driverLat = $overrideDriverLat ?? ($delivery?->current_latitude ? (float) $delivery->current_latitude : null);
        $driverLng = $overrideDriverLng ?? ($delivery?->current_longitude ? (float) $delivery->current_longitude : null);
        
        $isDelivering = $overrideIsDelivering ?? ($isInTransitStatus && $driverLat !== null && $driverLng !== null);

        // When in transit / delivering, active route is strictly from courier vehicle to buyer destination
        $originLat = ($isDelivering && $driverLat !== null) ? $driverLat : $pickup['lat'];
        $originLng = ($isDelivering && $driverLng !== null) ? $driverLng : $pickup['lng'];

        // Calculate turn-by-turn road route via OSRM with resilient caching
        $roadRoute = $this->resolveRoadRoute(
            $originLat,
            $originLng,
            $dropoff['lat'],
            $dropoff['lng'],
            $vehicleType
        );

        $driverUser = $delivery?->relationLoaded('driverUser') ? $delivery->driverUser : $delivery?->driverUser;
        $employeeAccount = $driverEmployee && $driverEmployee->relationLoaded('loginAccount') ? $driverEmployee->loginAccount : $driverEmployee?->loginAccount;

        $driverName = $delivery?->driver_name
            ?: ($driverEmployee?->name
                ?: ($employeeAccount?->name
                    ?: ($driverUser?->name ?: 'Studio Courier')));

        $driverPhone = $delivery?->driver_phone
            ?: ($employeeAccount?->phone_number
                ?: ($employeeAccount?->contact_number
                    ?: ($driverEmployee?->phone_number
                        ?: ($driverUser?->phone_number ?: null))));

        $driverPlate = $delivery?->vehicle_plate_number
            ?: ($driverEmployee?->vehicle_plate_number ?: null);

        return [
            'success' => true,
            'order_number' => $order->order_number,
            'is_delivering' => $isDelivering,
            'pickup' => $pickup,
            'driver' => ($driverLat !== null && $driverLng !== null) ? [
                'lat' => $driverLat,
                'lng' => $driverLng,
                'driver_name' => $driverName,
                'driver_phone' => $driverPhone,
                'vehicle_type' => $vehicleType,
                'vehicle_plate_number' => $driverPlate,
                'heading' => $delivery?->heading !== null ? (float) $delivery->heading : null,
                'speed_kph' => $delivery?->speed_kph !== null ? (float) $delivery->speed_kph : null,
            ] : null,
            'dropoff' => $dropoff,
            'distance_km' => $roadRoute['distance_km'],
            'duration_mins' => $roadRoute['duration_mins'],
            'vehicle' => [
                'type' => $vehicleType,
                'label' => $vehicleLabel,
                'icon' => $vehicleIcon,
            ],
            'route' => $roadRoute,
            'is_estimated' => $pickup['is_estimated'] || $dropoff['is_estimated'],
        ];
    }

    /**
     * Resolve road route for direct coordinates (fallback for mock or decoupled previews)
     */
    public function resolveDirectCoordinates(
        float $pickupLat,
        float $pickupLng,
        float $dropoffLat,
        float $dropoffLng,
        string $vehicleType = 'Motorcycle',
        string $orderNumber = '',
        ?float $driverLat = null,
        ?float $driverLng = null,
        bool $isDelivering = false,
        ?string $driverName = null,
        ?string $driverPhone = null,
        ?string $driverPlate = null,
        ?float $heading = null,
        ?float $speedKph = null
    ): array {
        // When delivering, active route is strictly from vehicle to buyer drop-off
        $originLat = ($isDelivering && $driverLat !== null) ? $driverLat : $pickupLat;
        $originLng = ($isDelivering && $driverLng !== null) ? $driverLng : $pickupLng;

        $roadRoute = $this->resolveRoadRoute($originLat, $originLng, $dropoffLat, $dropoffLng, $vehicleType);

        $vehicleIcon = match (strtolower($vehicleType)) {
            'bicycle', 'bike' => 'bike',
            'car', 'sedan' => 'car',
            'truck', 'van' => 'truck',
            default => 'motorcycle',
        };

        return [
            'success' => true,
            'order_number' => $orderNumber,
            'is_delivering' => $isDelivering && $driverLat !== null,
            'pickup' => [
                'lat' => $pickupLat,
                'lng' => $pickupLng,
                'address' => 'Studio Origin',
                'label' => 'Studio Pickup',
                'is_estimated' => false,
            ],
            'driver' => ($driverLat !== null && $driverLng !== null) ? [
                'lat' => $driverLat,
                'lng' => $driverLng,
                'driver_name' => $driverName ?: 'Studio Courier',
                'driver_phone' => $driverPhone,
                'vehicle_type' => $vehicleType,
                'vehicle_plate_number' => $driverPlate,
                'heading' => $heading,
                'speed_kph' => $speedKph,
            ] : null,
            'dropoff' => [
                'lat' => $dropoffLat,
                'lng' => $dropoffLng,
                'address' => 'Customer Destination',
                'label' => 'Buyer Drop-off',
                'is_estimated' => false,
            ],
            'distance_km' => $roadRoute['distance_km'],
            'duration_mins' => $roadRoute['duration_mins'],
            'vehicle' => [
                'type' => $vehicleType,
                'label' => $vehicleType,
                'icon' => $vehicleIcon,
            ],
            'route' => $roadRoute,
            'is_estimated' => false,
        ];
    }

    /**
     * @return array{lat: float, lng: float, address: string, label: string, is_estimated: bool}
     */
    private function resolvePickup(User $seller): array
    {
        $sellerDefaultAddress = $seller->getDefaultAddress();
        $lat = $sellerDefaultAddress?->latitude ?? ($seller->latitude ?? null);
        $lng = $sellerDefaultAddress?->longitude ?? ($seller->longitude ?? null);

        $preferredAddress = $seller->getPreferredCourierPickupAddress()
            ?: trim(($seller->street_address ?? '') . ', ' . ($seller->city ?? 'Dasmariñas') . ', Cavite');

        if (!empty($lat) && !empty($lng)) {
            return [
                'lat' => (float) $lat,
                'lng' => (float) $lng,
                'address' => $preferredAddress,
                'label' => $seller->shop_name ?: $seller->name,
                'is_estimated' => false,
            ];
        }

        $candidates = $seller->getCourierPickupAddressCandidates();
        if (!empty($candidates)) {
            try {
                $result = $this->geocodingService->geocode($candidates, 'seller pickup');
                $lat = (float) $result['lat'];
                $lng = (float) $result['lng'];

                // Persist verified coordinates to seller and default address to avoid future lookups
                if (\Illuminate\Support\Facades\Schema::hasColumn('users', 'latitude')) {
                    $seller->updateQuietly([
                        'latitude' => $lat,
                        'longitude' => $lng,
                    ]);
                }
                $sellerDefaultAddress?->updateQuietly([
                    'latitude' => $lat,
                    'longitude' => $lng,
                ]);

                return [
                    'lat' => $lat,
                    'lng' => $lng,
                    'address' => $preferredAddress,
                    'label' => $seller->shop_name ?: $seller->name,
                    'is_estimated' => false,
                ];
            } catch (\Throwable $e) {
                Log::info("Nominatim pickup geocode fallback for seller {$seller->id}: {$e->getMessage()}");
            }
        }

        $cityCoords = CaviteAddress::getCityCoordinates($seller->city) ?? ['lat' => 14.3294, 'lng' => 120.9367];

        return [
            'lat' => (float) $cityCoords['lat'],
            'lng' => (float) $cityCoords['lng'],
            'address' => $preferredAddress,
            'label' => $seller->shop_name ?: $seller->name,
            'is_estimated' => true,
        ];
    }

    /**
     * @return array{lat: float, lng: float, address: string, label: string, is_estimated: bool}
     */
    private function resolveDropoff(Order $order): array
    {
        $preferredAddress = trim((string) $order->shipping_address) ?: ($order->shipping_city ? "{$order->shipping_city}, Cavite" : 'Cavite, Philippines');

        if (!empty($order->shipping_latitude) && !empty($order->shipping_longitude)) {
            return [
                'lat' => (float) $order->shipping_latitude,
                'lng' => (float) $order->shipping_longitude,
                'address' => $preferredAddress,
                'label' => $order->customer_name ?: 'Buyer Drop-off',
                'is_estimated' => false,
            ];
        }

        $structured = StructuredAddress::formatPhilippineAddress([
            'street_address' => $order->shipping_street_address,
            'barangay' => $order->shipping_barangay,
            'city' => $order->shipping_city,
            'region' => $order->shipping_region,
            'postal_code' => $order->shipping_postal_code,
        ]);

        $query = $structured !== '' ? $structured : $preferredAddress;

        try {
            $result = $this->geocodingService->geocode($query, 'buyer drop-off');
            $lat = (float) $result['lat'];
            $lng = (float) $result['lng'];

            // Opportunistically persist coordinates to order to avoid future Nominatim lookups
            $order->updateQuietly([
                'shipping_latitude' => $lat,
                'shipping_longitude' => $lng,
            ]);

            return [
                'lat' => $lat,
                'lng' => $lng,
                'address' => $preferredAddress,
                'label' => $order->customer_name ?: 'Buyer Drop-off',
                'is_estimated' => false,
            ];
        } catch (\Throwable $e) {
            Log::info("Nominatim dropoff geocode fallback for order {$order->id}: {$e->getMessage()}");
        }

        $cityCoords = CaviteAddress::getCityCoordinates($order->shipping_city) ?? ['lat' => 14.3294, 'lng' => 120.9367];

        return [
            'lat' => (float) $cityCoords['lat'],
            'lng' => (float) $cityCoords['lng'],
            'address' => $preferredAddress,
            'label' => $order->customer_name ?: 'Buyer Drop-off',
            'is_estimated' => true,
        ];
    }

    /**
     * Resolve road route coordinates using OSRM with caching and fast fallback.
     *
     * @return array{
     *     coordinates: array<int, array{0: float, 1: float}>,
     *     distance_km: float,
     *     duration_mins: int,
     *     is_road_routed: bool
     * }
     */
    private function resolveRoadRoute(float $pickupLat, float $pickupLng, float $dropoffLat, float $dropoffLng, string $vehicleType = 'motorcycle'): array
    {
        $profile = 'driving';
        if (strtolower($vehicleType) === 'bicycle' || strtolower($vehicleType) === 'bike') {
            $profile = 'bike';
        }

        $cacheKey = sprintf('route_osrm_%s_%.4f_%.4f_%.4f_%.4f', $profile, $pickupLat, $pickupLng, $dropoffLat, $dropoffLng);

        // Check if verified road route is already cached
        if (Cache::has($cacheKey)) {
            $cached = Cache::get($cacheKey);
            if (is_array($cached) && !empty($cached['is_road_routed']) && !empty($cached['coordinates'])) {
                return $cached;
            }
        }

        try {
            // OSRM coordinates format: lng,lat;lng,lat
            $url = sprintf(
                'https://router.project-osrm.org/route/v1/%s/%f,%f;%f,%f?overview=full&geometries=geojson',
                $profile,
                $pickupLng,
                $pickupLat,
                $dropoffLng,
                $dropoffLat
            );

            $response = Http::timeout(5)
                ->connectTimeout(3)
                ->withHeaders(['User-Agent' => 'LikhangKamay/1.0 (info@likhangkamay.app)'])
                ->get($url);

            if ($response->successful()) {
                $data = $response->json();
                if (($data['code'] ?? '') === 'Ok' && !empty($data['routes'][0]['geometry']['coordinates'])) {
                    // GeoJSON coordinates are [lng, lat], Leaflet expects [lat, lng]
                    $rawCoords = $data['routes'][0]['geometry']['coordinates'];
                    $roadCoords = [];
                    foreach ($rawCoords as $coord) {
                        $roadCoords[] = [(float) $coord[1], (float) $coord[0]];
                    }

                    $roadDistanceKm = round(((float) $data['routes'][0]['distance']) / 1000.0, 1);
                    $durationSeconds = (float) ($data['routes'][0]['duration'] ?? 0);
                    $durationMins = max(1, (int) round($durationSeconds / 60));

                    $result = [
                        'coordinates' => $roadCoords,
                        'distance_km' => $roadDistanceKm,
                        'duration_mins' => $durationMins,
                        'is_road_routed' => true,
                    ];

                    // Cache verified road routes for 7 days
                    Cache::put($cacheKey, $result, 86400 * 7);

                    return $result;
                }
            }
        } catch (\Throwable $e) {
            Log::info("OSRM road routing fallback for [{$pickupLat}, {$pickupLng}] -> [{$dropoffLat}, {$dropoffLng}]: {$e->getMessage()}");
        }

        // Fallback to direct Haversine if external service times out or fails (short 30s cache so retry succeeds quickly)
        $haversine = $this->calculateHaversineDistance($pickupLat, $pickupLng, $dropoffLat, $dropoffLng);
        $fallback = [
            'coordinates' => [
                [$pickupLat, $pickupLng],
                [$dropoffLat, $dropoffLng],
            ],
            'distance_km' => $haversine,
            'duration_mins' => max(1, (int) round(($haversine / 25.0) * 60)), // Urban courier ~25km/h
            'is_road_routed' => false,
        ];

        Cache::put($cacheKey, $fallback, 30);

        return $fallback;
    }

    private function calculateHaversineDistance(float $latA, float $lngA, float $latB, float $lngB): float
    {
        $earthRadiusKm = 6371.0;
        $dLat = deg2rad($latB - $latA);
        $dLng = deg2rad($lngB - $lngA);

        $a = sin($dLat / 2) ** 2 +
            cos(deg2rad($latA)) * cos(deg2rad($latB)) * (sin($dLng / 2) ** 2);

        $c = 2 * atan2(sqrt($a), sqrt(1 - $a));

        return round($earthRadiusKm * $c, 1);
    }
}
