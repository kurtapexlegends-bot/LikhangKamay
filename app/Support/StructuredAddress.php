<?php

namespace App\Support;

use Illuminate\Support\Str;

class StructuredAddress
{
    /**
     * @param  array<int, string|null>  $parts
     */
    public static function format(array $parts): string
    {
        $normalized = [];

        foreach ($parts as $part) {
            $value = self::clean($part);

            if ($value === null) {
                continue;
            }

            $fingerprint = Str::lower(Str::ascii($value));

            if ($fingerprint === '' || in_array($fingerprint, $normalized, true)) {
                continue;
            }

            $normalized[$fingerprint] = $value;
        }

        return implode(', ', array_values($normalized));
    }

    /**
     * @param  array<string, mixed>  $parts
     */
    public static function formatPhilippineAddress(array $parts): string
    {
        return self::format([
            $parts['street_address'] ?? null,
            $parts['barangay'] ?? null,
            $parts['city'] ?? null,
            $parts['region'] ?? null,
            $parts['postal_code'] ?? null,
        ]);
    }

    public static function normalizeForComparison(?string $value): string
    {
        $value = self::clean($value) ?? '';

        if ($value === '') {
            return '';
        }

        $value = Str::of($value)
            ->replaceMatches('/,\s*(philippines)\s*$/i', '')
            ->replaceMatches('/,\s*\d{4,5}\s*$/', '')
            ->ascii()
            ->lower()
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->value();

        return trim($value);
    }

    public static function componentCount(?string $value): int
    {
        $value = self::clean($value);

        if ($value === null) {
            return 0;
        }

        return count(array_filter(array_map(
            static fn ($part) => self::clean($part),
            explode(',', $value)
        )));
    }

    public static function looksPreciseEnoughForCourier(?string $value): bool
    {
        return self::componentCount($value) >= 4;
    }

    public static function clean(?string $value): ?string
    {
        $value = trim((string) $value);

        if ($value === '') {
            return null;
        }

        $value = preg_replace('/\s+/', ' ', $value);

        return $value === null ? null : trim($value, " \t\n\r\0\x0B,");
    }
}
