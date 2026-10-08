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

        // Static public assets (e.g., /images/placeholder.svg, /models/demo/...)
        if (str_starts_with($path, '/images/') || str_starts_with($path, 'images/')
            || str_starts_with($path, '/models/') || str_starts_with($path, 'models/')
            || str_starts_with($path, '/demo/') || str_starts_with($path, 'demo/')) {
            return str_starts_with($path, '/') ? $path : '/' . $path;
        }

        // Strip any accidental leading '/storage/' or 'storage/' prefix
        $cleanPath = preg_replace('#^/?storage/#', '', $path);
        $disk = self::disk();

        try {
            /** @var \Illuminate\Filesystem\FilesystemAdapter $adapter */
            $adapter = Storage::disk($disk);
            return $adapter->url($cleanPath);
        } catch (\Throwable $e) {
            return asset('storage/' . ltrim($cleanPath, '/'));
        }
    }

    /**
     * Resolve the active storage disk (s3 in production/cloud, public locally).
     */
    public static function disk(): string
    {
        $defaultDisk = (string) config('filesystems.default', 'public');
        $publicDriver = (string) config('filesystems.disks.public.driver', 'local');

        return ($defaultDisk === 's3' || $publicDriver === 's3') ? 's3' : 'public';
    }

    /**
     * Safely delete a file from the active storage disk.
     */
    public static function delete(?string $path): bool
    {
        if (empty($path)) {
            return false;
        }

        $cleanPath = preg_replace('#^/?storage/#', '', $path);

        try {
            return Storage::disk(self::disk())->delete($cleanPath);
        } catch (\Throwable $e) {
            return false;
        }
    }
}
