<?php

namespace App\Support;

class RouteObfuscator
{
    /**
     * Get the encryption key derived from app key.
     */
    private static function getKey(): string
    {
        $key = config('app.key');
        if (str_starts_with($key, 'base64:')) {
            $key = base64_decode(substr($key, 7));
        }
        // AES-128 requires a 16-byte key
        return substr($key, 0, 16);
    }

    /**
     * Encrypt / Obfuscate an integer ID or slug.
     */
    public static function encode(mixed $value): string
    {
        if (empty($value)) {
            return '';
        }
        
        $encrypted = openssl_encrypt((string) $value, 'AES-128-ECB', self::getKey(), OPENSSL_RAW_DATA);
        if ($encrypted === false) {
            return '';
        }
        
        // Convert to URL-safe base64
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($encrypted));
    }

    /**
     * Decrypt / Deobfuscate the value.
     */
    public static function decode(mixed $value): ?string
    {
        if (!is_string($value) || empty($value)) {
            return null;
        }

        // Restore base64 characters
        $base64 = str_replace(['-', '_'], ['+', '/'], $value);
        
        // Pad base64 if needed
        $padding = strlen($base64) % 4;
        if ($padding) {
            $base64 .= str_repeat('=', 4 - $padding);
        }

        $decoded = base64_decode($base64, true);
        if ($decoded === false) {
            return null;
        }

        $decrypted = openssl_decrypt($decoded, 'AES-128-ECB', self::getKey(), OPENSSL_RAW_DATA);
        
        return $decrypted !== false ? $decrypted : null;
    }
}
