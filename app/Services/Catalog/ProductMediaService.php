<?php

namespace App\Services\Catalog;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class ProductMediaService
{
    /**
     * Store and return path of the uploaded file
     *
     * @param UploadedFile $file
     * @param string $path
     * @return string
     */
    public function resizeAndSave(UploadedFile $file, string $path): string
    {
        try {
            return $file->store($path, 'public');
        } catch (\Exception $e) {
            Log::error("Image storage failed: " . $e->getMessage());
            return $file->store($path, 'public');
        }
    }

    /**
     * Delete stored cover photo
     *
     * @param string|null $path
     * @return void
     */
    public function deleteCoverPhoto(?string $path): void
    {
        if ($path) {
            Storage::disk('public')->delete($path);
        }
    }

    /**
     * Delete stored gallery photos
     *
     * @param array $paths
     * @return void
     */
    public function deleteGalleryPhotos(array $paths): void
    {
        foreach ($paths as $path) {
            Storage::disk('public')->delete($path);
        }
    }

    /**
     * Process gallery updates and return the remaining + uploaded gallery paths
     *
     * @param array|null $newFiles
     * @param array $retainedPaths
     * @param array $originalPaths
     * @return array
     */
    public function handleGallery(
        ?array $newFiles,
        array $retainedPaths = [],
        array $originalPaths = []
    ): array {
        $deletedPaths = array_diff($originalPaths, $retainedPaths);
        $this->deleteGalleryPhotos($deletedPaths);

        $galleryPaths = $retainedPaths;
        if ($newFiles) {
            foreach ($newFiles as $file) {
                if ($file instanceof UploadedFile) {
                    $galleryPaths[] = $this->resizeAndSave($file, 'products/gallery');
                }
            }
        }

        return $galleryPaths;
    }
}
