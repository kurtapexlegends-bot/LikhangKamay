<?php

namespace App\Support;

class CourierAddressResolver
{
    /**
     * @param  array<int, string>  $fallbackCandidates
     */
    public static function resolveCourierStopAddress(string $preferredAddress, array $coordinates, array $fallbackCandidates): string
    {
        $preferredAddress = trim($preferredAddress);
        $matchedQuery = trim((string) ($coordinates['matched_query'] ?? ''));
        $fallbackAddress = trim((string) ($fallbackCandidates[0] ?? ''));

        if ($preferredAddress === '') {
            return $matchedQuery !== '' ? $matchedQuery : $fallbackAddress;
        }

        if (self::addressesAreEquivalent($preferredAddress, $matchedQuery)) {
            return $preferredAddress;
        }

        return $matchedQuery !== '' ? $matchedQuery : $preferredAddress;
    }

    public static function addressesAreEquivalent(?string $left, ?string $right): bool
    {
        $left = StructuredAddress::normalizeForComparison($left);
        $right = StructuredAddress::normalizeForComparison($right);

        return $left !== '' && $left === $right;
    }

    public static function isSameCourierLocation(array|string $pickupAddress, array|string $dropoffAddress, array $pickupCoordinates, array $dropoffCoordinates): bool
    {
        if (self::addressesAreEquivalent((string) $pickupAddress, (string) $dropoffAddress)) {
            return true;
        }

        $distanceMeters = self::distanceBetweenCoordinates(
            (float) ($pickupCoordinates['lat'] ?? 0),
            (float) ($pickupCoordinates['lng'] ?? 0),
            (float) ($dropoffCoordinates['lat'] ?? 0),
            (float) ($dropoffCoordinates['lng'] ?? 0),
        );

        return $distanceMeters !== null && $distanceMeters <= 100;
    }

    public static function distanceBetweenCoordinates(float $latA, float $lngA, float $latB, float $lngB): ?float
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
}
