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

    public function __construct()
    {
        // Intervention Image v3/v4 syntax
        /** @var \Intervention\Image\ImageManager $this->manager */
        $this->manager = new ImageManager(new Driver());
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
        $fullPath = storage_path('app/public/' . $path);

        if (!File::exists($fullPath)) {
            // Try absolute path if relative fails
            $fullPath = $path;
            if (!File::exists($fullPath)) {
                throw new \Exception("Image not found at: {$fullPath}");
            }
        }

        $image = $this->manager->read($fullPath);

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
