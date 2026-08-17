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
