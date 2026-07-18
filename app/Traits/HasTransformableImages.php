<?php

namespace App\Traits;

use Illuminate\Support\Facades\Storage;

trait HasTransformableImages
{
    /**
     * Get a transformed image URL.
     * 
     * @param string|null $path The storage path
     * @param array $options ['width' => 200, 'height' => 200, 'resize' => 'cover', 'quality' => 80]
     * @return string|null
     */
    public function getTransformedUrl(?string $path, array $options = []): ?string
    {
        if (!$path) return null;

        // If it's an external URL already, return it
        if (filter_var($path, FILTER_VALIDATE_URL)) return $path;

        $baseUrl = null;
        try {
            /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
            $disk = Storage::disk('public');
            $baseUrl = $disk->url($path);
        } catch (\Throwable $e) {
            $baseUrl = asset('storage/' . $path);
        }

        if (!empty($options)) {
            if (config('filesystems.disks.public.driver') === 's3') {
                // Supabase transformation format
                $endpoint = (string) config('filesystems.disks.public.endpoint', '');
                $bucket = config('filesystems.disks.public.bucket');
                
                if (str_contains($endpoint, 'storage.supabase.co')) {
                    $transformBase = str_replace('.storage.supabase.co', '.supabase.co/storage/v1/render/image/public', $endpoint);
                } else {
                    $transformBase = str_replace('/s3', '/render/image/public', $endpoint);
                }
                
                $queryString = http_build_query($options);
                
                return "{$transformBase}/{$bucket}/{$path}?{$queryString}";
            } else {
                // OPTIMIZATION: Bypassing the proxy locally because concurrent image 
                // requests clog the single-threaded PHP dev server and block Inertia navigation.
                return $baseUrl;
            }
        }

        return $baseUrl;
    }
}
