<?php

declare(strict_types=1);

namespace App\Support;

use Illuminate\Support\Str;

class CaviteAddress
{
    public const PROVINCE = 'Cavite';

    /**
     * Official 23 Cities and Municipalities in Cavite
     */
    public const CITIES = [
        'Alfonso',
        'Amadeo',
        'Bacoor City',
        'Carmona',
        'Cavite City',
        'Dasmariñas City',
        'General Emilio Aguinaldo',
        'General Mariano Alvarez',
        'General Trias City',
        'Imus City',
        'Indang',
        'Kawit',
        'Magallanes',
        'Maragondon',
        'Mendez',
        'Naic',
        'Noveleta',
        'Rosario',
        'Silang',
        'Tagaytay City',
        'Tanza',
        'Ternate',
        'Trece Martires City',
    ];

    /**
     * Official approximate city/municipality centroid coordinates in Cavite
     *
     * @var array<string, array{lat: float, lng: float}>
     */
    public const CITY_COORDINATES = [
        'bacoor' => ['lat' => 14.4624, 'lng' => 120.9645],
        'cavite city' => ['lat' => 14.4831, 'lng' => 120.8986],
        'dasmarinas' => ['lat' => 14.3294, 'lng' => 120.9367],
        'general trias' => ['lat' => 14.3867, 'lng' => 120.8812],
        'imus' => ['lat' => 14.4296, 'lng' => 120.9367],
        'tagaytay' => ['lat' => 14.1153, 'lng' => 120.9621],
        'trece martires' => ['lat' => 14.2827, 'lng' => 120.8669],
        'alfonso' => ['lat' => 14.1378, 'lng' => 120.8539],
        'amadeo' => ['lat' => 14.1706, 'lng' => 120.9231],
        'carmona' => ['lat' => 14.3142, 'lng' => 121.0583],
        'general emilio aguinaldo' => ['lat' => 14.1833, 'lng' => 120.7981],
        'general mariano alvarez' => ['lat' => 14.3000, 'lng' => 121.0044],
        'indang' => ['lat' => 14.1953, 'lng' => 120.8767],
        'kawit' => ['lat' => 14.4444, 'lng' => 120.9028],
        'magallanes' => ['lat' => 14.1917, 'lng' => 120.7556],
        'maragondon' => ['lat' => 14.2750, 'lng' => 120.7381],
        'mendez' => ['lat' => 14.1294, 'lng' => 120.9042],
        'naic' => ['lat' => 14.3197, 'lng' => 120.7678],
        'noveleta' => ['lat' => 14.4283, 'lng' => 120.8803],
        'rosario' => ['lat' => 14.4144, 'lng' => 120.8575],
        'silang' => ['lat' => 14.2319, 'lng' => 120.9742],
        'tanza' => ['lat' => 14.3942, 'lng' => 120.8542],
        'ternate' => ['lat' => 14.2881, 'lng' => 120.7167],
    ];

    /**
     * Resolve approximate coordinates for a Cavite city or municipality
     *
     * @return array{lat: float, lng: float}|null
     */
    public static function getCityCoordinates(?string $city): ?array
    {
        if ($city === null || trim($city) === '') {
            return null;
        }

        $normalized = self::normalize($city);
        return self::CITY_COORDINATES[$normalized] ?? null;
    }

    /**
     * Check if a given region string is strictly Cavite
     */
    public static function isCaviteRegion(?string $region): bool
    {
        if ($region === null) {
            return false;
        }

        $cleaned = self::normalize($region);

        return in_array($cleaned, ['cavite', 'province of cavite', 'cavite province'], true);
    }

    /**
     * Normalize text for accent-insensitive and suffix-tolerant comparison
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
            ->replaceMatches('/,\s*cavite\s*$/i', '')
            ->replaceMatches('/\s+city$/i', '')
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->value();
    }

    /**
     * Verify if a given city string belongs to Cavite
     */
    public static function isValidCity(?string $city): bool
    {
        if ($city === null || trim($city) === '') {
            return false;
        }

        $normalizedInput = self::normalize($city);

        foreach (self::CITIES as $validCity) {
            if (self::normalize($validCity) === $normalizedInput) {
                return true;
            }
        }

        return false;
    }

    /**
     * Resolve the canonical city name if valid
     */
    public static function resolveCanonicalCity(?string $city): ?string
    {
        if ($city === null || trim($city) === '') {
            return null;
        }

        $normalizedInput = self::normalize($city);

        foreach (self::CITIES as $validCity) {
            if (self::normalize($validCity) === $normalizedInput) {
                return $validCity;
            }
        }

        return $city;
    }
}
