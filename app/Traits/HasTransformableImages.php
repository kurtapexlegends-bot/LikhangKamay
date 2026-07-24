<?php

namespace App\Traits;

use App\Services\StorageUrl;

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
        return StorageUrl::url($path);
    }
}
