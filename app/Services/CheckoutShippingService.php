<?php

namespace App\Services;

use App\Models\User;
use App\Support\StructuredAddress;

class CheckoutShippingService
{
    /**
     * @param  array<string, mixed>  $destination
     * @return array{amount: float, currency: string, source: string}
     */
    public function estimateForSeller(User $seller, array $destination): array
    {
        $currency = 'PHP';

        if (($destination['shipping_method'] ?? 'Delivery') !== 'Delivery') {
            return [
                'amount' => 0.0,
                'currency' => $currency,
                'source' => 'pickup',
            ];
        }

        if ($this->shouldUseFlatFallback()) {
            return [
                'amount' => $this->flatFallbackAmount(),
                'currency' => $currency,
                'source' => 'fallback_flat',
            ];
        }

        $pickupCandidates = $seller->getCourierPickupAddressCandidates();
        $preferredPickupAddress = trim((string) ($seller->getPreferredCourierPickupAddress() ?? ($pickupCandidates[0] ?? '')));

        $structuredDropoffAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $destination['shipping_street_address'] ?? null,
            'barangay' => $destination['shipping_barangay'] ?? null,
            'city' => $destination['shipping_city'] ?? null,
            'region' => $destination['shipping_region'] ?? null,
            'postal_code' => $destination['shipping_postal_code'] ?? null,
        ]);

        $dropoffCandidates = array_values(array_filter([
            $structuredDropoffAddress,
            trim((string) ($destination['shipping_address'] ?? '')),
        ]));

        if (empty($pickupCandidates) || empty($dropoffCandidates)) {
            return [
                'amount' => $this->flatFallbackAmount(),
                'currency' => $currency,
                'source' => 'fallback_flat',
            ];
        }

        try {
            $pickupCoordinates = $this->geocodingService()->geocode($pickupCandidates, 'seller pickup');
            $dropoffCoordinates = $this->geocodingService()->geocode(
                count($dropoffCandidates) === 1 ? $dropoffCandidates[0] : $dropoffCandidates,
                'buyer drop-off'
            );

            $pickupAddress = $this->resolveCourierStopAddress($preferredPickupAddress, $pickupCoordinates, $pickupCandidates);
            $dropoffAddress = $this->resolveCourierStopAddress(
                trim((string) ($structuredDropoffAddress !== '' ? $structuredDropoffAddress : ($dropoffCandidates[0] ?? ''))),
                $dropoffCoordinates,
                $dropoffCandidates
            );

            $quotation = $this->lalamoveService()->createQuotation([
                'serviceType' => (string) config('services.lalamove.service_type', 'MOTORCYCLE'),
                'language' => 'en_PH',
                'stops' => [
                    [
                        'coordinates' => [
                            'lat' => $pickupCoordinates['lat'],
                            'lng' => $pickupCoordinates['lng'],
                        ],
                        'address' => $pickupAddress,
                    ],
                    [
                        'coordinates' => [
                            'lat' => $dropoffCoordinates['lat'],
                            'lng' => $dropoffCoordinates['lng'],
                        ],
                        'address' => $dropoffAddress,
                    ],
                ],
            ]);

            $quotedTotal = round((float) data_get($quotation, 'priceBreakdown.total', 0), 2);

            if ($quotedTotal > 0) {
                return [
                    'amount' => $quotedTotal,
                    'currency' => (string) (data_get($quotation, 'priceBreakdown.currency', $currency) ?: $currency),
                    'source' => 'lalamove_quote',
                ];
            }
        } catch (\Throwable) {
            // Fall back to deterministic local estimate below.
        }

        try {
            $pickupCoordinates = $this->geocodingService()->geocode($pickupCandidates, 'seller pickup');
            $dropoffCoordinates = $this->geocodingService()->geocode(
                count($dropoffCandidates) === 1 ? $dropoffCandidates[0] : $dropoffCandidates,
                'buyer drop-off'
            );

            return [
                'amount' => $this->distanceFallbackAmount($pickupCoordinates, $dropoffCoordinates),
                'currency' => $currency,
                'source' => 'fallback_distance',
            ];
        } catch (\Throwable) {
            return [
                'amount' => $this->flatFallbackAmount(),
                'currency' => $currency,
                'source' => 'fallback_flat',
            ];
        }
    }

    private function shouldUseFlatFallback(): bool
    {
        return app()->environment('testing')
            || blank(config('services.lalamove.api_key'))
            || blank(config('services.lalamove.api_secret'));
    }

    private function flatFallbackAmount(): float
    {
        return round((float) config('services.checkout_shipping.fallback_flat_fee', 69), 2);
    }

    /**
     * @param  array<string, mixed>  $pickupCoordinates
     * @param  array<string, mixed>  $dropoffCoordinates
     */
    private function distanceFallbackAmount(array $pickupCoordinates, array $dropoffCoordinates): float
    {
        $distanceMeters = $this->distanceBetweenCoordinates(
            (float) ($pickupCoordinates['lat'] ?? 0),
            (float) ($pickupCoordinates['lng'] ?? 0),
            (float) ($dropoffCoordinates['lat'] ?? 0),
            (float) ($dropoffCoordinates['lng'] ?? 0),
        );

        if ($distanceMeters === null) {
            return $this->flatFallbackAmount();
        }

        $distanceKm = $distanceMeters / 1000;
        $baseFee = (float) config('services.checkout_shipping.fallback_base_fee', 69);
        $includedKm = max(0.0, (float) config('services.checkout_shipping.fallback_included_km', 3));
        $perKm = max(0.0, (float) config('services.checkout_shipping.fallback_per_km', 10));
        $extraKm = max(0.0, ceil(max(0.0, $distanceKm - $includedKm)));

        return round(max($this->flatFallbackAmount(), $baseFee + ($extraKm * $perKm)), 2);
    }

    /**
     * @param  array<int, string>  $fallbackCandidates
     * @param  array<string, mixed>  $coordinates
     */
    private function resolveCourierStopAddress(string $preferredAddress, array $coordinates, array $fallbackCandidates): string
    {
        $preferredAddress = trim($preferredAddress);
        $matchedQuery = trim((string) ($coordinates['matched_query'] ?? ''));
        $fallbackAddress = trim((string) ($fallbackCandidates[0] ?? ''));

        if ($preferredAddress === '') {
            return $matchedQuery !== '' ? $matchedQuery : $fallbackAddress;
        }

        return $matchedQuery !== '' ? $matchedQuery : $preferredAddress;
    }

    private function distanceBetweenCoordinates(float $latA, float $lngA, float $latB, float $lngB): ?float
    {
        if ($latA === 0.0 || $lngA === 0.0 || $latB === 0.0 || $lngB === 0.0) {
            return null;
        }

        $earthRadius = 6371000;
        $latDelta = deg2rad($latB - $latA);
        $lngDelta = deg2rad($lngB - $lngA);
        $latA = deg2rad($latA);
        $latB = deg2rad($latB);

        $haversine = sin($latDelta / 2) ** 2
            + cos($latA) * cos($latB) * sin($lngDelta / 2) ** 2;

        $arc = 2 * atan2(sqrt($haversine), sqrt(1 - $haversine));

        return $earthRadius * $arc;
    }

    private function geocodingService(): AddressGeocodingService
    {
        return app(AddressGeocodingService::class);
    }

    private function lalamoveService(): LalamoveService
    {
        return app(LalamoveService::class);
    }
}
