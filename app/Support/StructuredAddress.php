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

        $v = Str::of($value)
            ->replaceMatches('/,\s*(philippines|pilipinas)\s*$/i', '')
            ->replaceMatches('/,\s*\d{4,5}\s*$/', '')
            ->ascii()
            ->lower()
            ->replaceMatches('/\b(philippines|pilipinas)\b/i', '')
            ->replaceMatches('/\b(barangay|brgy|bgy)\b\.?/i', '')
            ->replaceMatches('/\b(block|blk)\b\.?/i', 'blk')
            ->replaceMatches('/\b(lot|lt)\b\.?/i', 'lot')
            ->replaceMatches('/\b(street|str|st)\b\.?/i', 'st')
            ->replaceMatches('/\b(avenue|ave)\b\.?/i', 'ave')
            ->replaceMatches('/\b(subdivision|subd)\b\.?/i', 'subd')
            ->replaceMatches('/\bcity\b/i', '')
            ->replaceMatches('/\b(municipality|province)\s+of\b/i', '')
            ->replaceMatches('/[^a-z0-9]+/', ' ')
            ->squish()
            ->value();

        // Convert Roman numerals commonly found in barangays/phases to digits
        $romanMap = [
            '/\bviii\b/' => '8',
            '/\bvii\b/' => '7',
            '/\bvi\b/' => '6',
            '/\biv\b/' => '4',
            '/\bv\b/' => '5',
            '/\bix\b/' => '9',
            '/\bx\b/' => '10',
            '/\biii\b/' => '3',
            '/\bii\b/' => '2',
            '/\bi\b/' => '1',
        ];
        $v = preg_replace(array_keys($romanMap), array_values($romanMap), $v);

        // Deduplicate adjacent identical tokens from structured address concatenation
        $words = explode(' ', (string) $v);
        $deduped = [];
        foreach ($words as $w) {
            if ($w === '') continue;
            if (empty($deduped) || end($deduped) !== $w) {
                $deduped[] = $w;
            }
        }

        $dedupedStr = implode(' ', $deduped);
        // Remove repeated consecutive multi-word phrases (e.g., "san miguel 1 san miguel 1", "cavite cavite")
        $dedupedStr = preg_replace('/\b(san miguel \d+)\s+\1\b/', '$1', $dedupedStr);
        $dedupedStr = preg_replace('/\b(cavite)\s+\1\b/', '$1', $dedupedStr);
        $dedupedStr = preg_replace('/\b(dasmarinas)\s+\1\b/', '$1', $dedupedStr);

        return trim(preg_replace('/\s+/', ' ', (string) $dedupedStr));
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
