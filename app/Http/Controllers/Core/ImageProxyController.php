<?php

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;

use App\Services\LocalImageTransformer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ImageProxyController extends Controller
{
    protected $transformer;

    public function __construct(LocalImageTransformer $transformer)
    {
        $this->transformer = $transformer;
    }

    /**
     * Proxy and transform images locally.
     * Usage: /img/proxy?src=avatars/1.jpg&w=100&h=100&fit=crop
     */
    public function proxy(Request $request)
    {
        $src = $request->query('src');
        if (!$src || !is_string($src)) {
            abort(400, 'Missing or invalid src parameter');
        }

        // Prevent open redirects, SSRF, and directory traversal
        if (preg_match('/^(?:https?:|\/\/|[a-z0-9+.-]+:|\.\.)/i', $src) || str_contains($src, '..')) {
            abort(400, 'Invalid or untrusted image source path');
        }

        // Remove /storage/ prefix if present to get relative path
        $path = ltrim(str_replace('/storage/', '', $src), '/');
        if ($path === '') {
            abort(400, 'Invalid image path');
        }
        
        // Fast fallback for serverless or environments without GD extension / local file access
        if (!$this->transformer->isAvailable() || config('filesystems.default') === 's3' || env('FILESYSTEM_DISK') === 's3') {
            $fallbackUrl = \App\Services\StorageUrl::url($path);
            return redirect($fallbackUrl ?: ('/storage/' . $path));
        }

        $params = [
            'w' => $request->query('w'),
            'h' => $request->query('h'),
            'fit' => $request->query('fit', 'max'),
            'q' => $request->query('q', 80),
        ];

        // Cache the transformed image
        $cacheKey = 'img_proxy_' . md5($path . serialize($params));

        try {
            $image = Cache::remember($cacheKey, 86400, function () use ($path, $params) {
                return (string) $this->transformer->transform($path, $params);
            });

            return response($image)
                ->header('Content-Type', 'image/jpeg')
                ->header('Cache-Control', 'public, max-age=86400');
        } catch (\DomainException $e) {
            abort(404, 'Image not found');
        } catch (\Throwable $e) {
            $fallbackUrl = \App\Services\StorageUrl::url($path);
            return redirect($fallbackUrl ?: ('/storage/' . $path));
        }
    }
}
