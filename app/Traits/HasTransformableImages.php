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

        $disk = Storage::disk('public');
        $baseUrl = $disk->url($path);

        // Only apply transformations if using S3 (Supabase)
        if (config('filesystems.disks.public.driver') === 's3' && !empty($options)) {
            // Supabase transformation format: 
            // https://[ref].supabase.co/storage/v1/render/image/public/[bucket]/[path]?width=200...
            
            $endpoint = config('filesystems.disks.public.endpoint');
            $bucket = config('filesystems.disks.public.bucket');
            
            // Convert S3 API endpoint to Transformation endpoint
            // From: https://ref.supabase.co/storage/v1/s3
            // To:   https://ref.supabase.co/storage/v1/render/image/public/bucket/path
            $transformBase = str_replace('/s3', '/render/image/public', $endpoint);
            $queryString = http_build_query($options);
            
            return "{$transformBase}/{$bucket}/{$path}?{$queryString}";
        }

        return $baseUrl;
    }
}
