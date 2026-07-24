<?php

namespace App\Services;

use Illuminate\Support\Facades\Storage;

class StorageUrl
{
    /**
     * Resolve a storage path into a fully qualified, browser-accessible public URL.
     *
     * @param string|null $path The relative path or URL
     * @param string|null $default Fallback URL if path is empty
     * @return string|null
     */
    public static function url(?string $path, ?string $default = null): ?string
    {
        if (empty($path)) {
            return $default;
        }

        // Return external/blob/data URLs immediately
        if (filter_var($path, FILTER_VALIDATE_URL) || str_starts_with($path, 'data:') || str_starts_with($path, 'blob:')) {
            return $path;
        }

        // Strip any accidental leading '/storage/' or 'storage/' prefix
        $cleanPath = preg_replace('#^/?storage/#', '', $path);

        try {
            return Storage::disk('public')->url($cleanPath);
        } catch (\Throwable $e) {
            return asset('storage/' . ltrim($cleanPath, '/'));
        }
    }
}
