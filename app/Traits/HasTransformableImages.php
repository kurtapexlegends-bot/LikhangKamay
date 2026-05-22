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

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');
        $baseUrl = $disk->url($path);

        if (!empty($options)) {
            if (config('filesystems.disks.public.driver') === 's3') {
                // Supabase transformation format
                $endpoint = config('filesystems.disks.public.endpoint');
                $bucket = config('filesystems.disks.public.bucket');
                
                $transformBase = str_replace('/s3', '/render/image/public', $endpoint);
                $queryString = http_build_query($options);
                
                return "{$transformBase}/{$bucket}/{$path}?{$queryString}";
            } else {
                // Use local Image Proxy Controller with absolute URL
                $options['src'] = $path;
                return route('img.proxy', $options, true);
            }
        }

        return $baseUrl;
    }
}
