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
    public function resolve(Order $order, User $seller): array
    {
        $pickup = $this->resolvePickup($seller);
        $dropoff = $this->resolveDropoff($order);

        // Resolve vehicle assignment
        $delivery = $order->delivery;
        $vehicleType = $delivery?->vehicle_type;

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

        // Calculate turn-by-turn road route via OSRM with 7-day cache
        $roadRoute = $this->resolveRoadRoute(
            $pickup['lat'],
            $pickup['lng'],
            $dropoff['lat'],
            $dropoff['lng'],
            $vehicleType
        );

        return [
            'success' => true,
            'order_number' => $order->order_number,
            'pickup' => $pickup,
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
                $seller->updateQuietly([
                    'latitude' => $lat,
                    'longitude' => $lng,
                ]);
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

        return Cache::remember($cacheKey, 86400 * 7, function () use ($pickupLat, $pickupLng, $dropoffLat, $dropoffLng, $profile) {
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

                $response = Http::timeout(3)
                    ->connectTimeout(2)
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

                        return [
                            'coordinates' => $roadCoords,
                            'distance_km' => $roadDistanceKm,
                            'duration_mins' => $durationMins,
                            'is_road_routed' => true,
                        ];
                    }
                }
            } catch (\Throwable $e) {
                Log::info("OSRM road routing fallback for [{$pickupLat}, {$pickupLng}] -> [{$dropoffLat}, {$dropoffLng}]: {$e->getMessage()}");
            }

            // Fallback to direct Haversine if external service times out or fails
            $haversine = $this->calculateHaversineDistance($pickupLat, $pickupLng, $dropoffLat, $dropoffLng);
            return [
                'coordinates' => [
                    [$pickupLat, $pickupLng],
                    [$dropoffLat, $dropoffLng],
                ],
                'distance_km' => $haversine,
                'duration_mins' => max(1, (int) round(($haversine / 25.0) * 60)), // Urban courier ~25km/h
                'is_road_routed' => false,
            ];
        });
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
