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
        if (!$src) {
            abort(400, 'Missing src parameter');
        }

        // Remove /storage/ prefix if present to get relative path
        $path = str_replace('/storage/', '', $src);
        
        $params = [
            'w' => $request->query('w'),
            'h' => $request->query('h'),
            'fit' => $request->query('fit', 'max'),
            'q' => $request->query('q', 80),
        ];

        // Cache the transformed image
        $cacheKey = 'img_proxy_' . md5($src . serialize($params));

        return Cache::remember($cacheKey, 86400, function () use ($path, $params) {
            try {
                $image = $this->transformer->transform($path, $params);
                return response($image)
                    ->header('Content-Type', 'image/jpeg') // Defaulting to jpeg for simplicity
                    ->header('Cache-Control', 'public, max-age=86400');
            } catch (\Exception $e) {
                // If transformation fails, redirect to original or abort
                return redirect($path);
            }
        });
    }
}
