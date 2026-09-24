<?php

namespace App\Services;

use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\File;

class LocalImageTransformer
{
    /** @var \Intervention\Image\ImageManager */
    protected $manager;

    public function __construct(?ImageManager $manager = null)
    {
        $this->manager = $manager ?? new ImageManager(new Driver());
    }

    /**
     * Transform an image based on parameters.
     * 
     * @param string $path Local path relative to storage/app/public
     * @param array $params [w, h, fit, q]
     * @return \Intervention\Image\EncodedImage
     */
    public function transform(string $path, array $params)
    {
        $sanitizedPath = ltrim(str_replace(['\\', '..'], ['/', ''], $path), '/');
        $baseDir = storage_path('app/public');
        $fullPath = $baseDir . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $sanitizedPath);

        $realBase = realpath($baseDir);
        $realPath = realpath($fullPath);

        if ($realBase === false || $realPath === false || !str_starts_with($realPath, $realBase) || !File::exists($realPath)) {
            throw new \DomainException("Image not found or access restricted: {$sanitizedPath}");
        }

        /** @var \Intervention\Image\ImageManager $manager */
        $manager = $this->manager;
        /** @var \Intervention\Image\Image $image */
        $image = $manager->read($fullPath);

        $width = $params['w'] ?? null;
        $height = $params['h'] ?? null;
        $fit = $params['fit'] ?? 'max'; // max, crop, fill
        $quality = $params['q'] ?? 80;

        if ($width || $height) {
            if ($fit === 'crop') {
                $image->cover($width, $height); // v3/v4 equivalent of fit/crop
            } else {
                $image->scale(width: $width, height: $height); // v3/v4 equivalent of resize
            }
        }

        return $image->toJpeg($quality);
    }
}
