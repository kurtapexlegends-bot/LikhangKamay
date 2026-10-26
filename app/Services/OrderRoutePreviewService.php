<?php

declare(strict_types=1);

namespace App\Services;

use App\Models\Order;
use App\Models\User;
use App\Support\CaviteAddress;
use App\Support\StructuredAddress;
use Illuminate\Support\Facades\Log;

class OrderRoutePreviewService
{
    public function __construct(
        private readonly AddressGeocodingService $geocodingService
    ) {}

    /**
     * Resolve verified delivery route coordinates, addresses, and direct distance.
     *
     * @return array{
     *     success: bool,
     *     order_number: string,
     *     pickup: array{lat: float, lng: float, address: string, label: string, is_estimated: bool},
     *     dropoff: array{lat: float, lng: float, address: string, label: string, is_estimated: bool},
     *     distance_km: float,
     *     is_estimated: bool
     * }
     */
    public function resolve(Order $order, User $seller): array
    {
        $pickup = $this->resolvePickup($seller);
        $dropoff = $this->resolveDropoff($order);

        $distanceKm = $this->calculateHaversineDistance(
            $pickup['lat'],
            $pickup['lng'],
            $dropoff['lat'],
            $dropoff['lng']
        );

        return [
            'success' => true,
            'order_number' => $order->order_number,
            'pickup' => $pickup,
            'dropoff' => $dropoff,
            'distance_km' => $distanceKm,
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
                return [
                    'lat' => (float) $result['lat'],
                    'lng' => (float) $result['lng'],
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
