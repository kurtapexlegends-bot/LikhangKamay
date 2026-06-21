<?php

namespace App\Services\Catalog;

use App\Http\Controllers\Concerns\HandlesThreeDModelBundles;
use App\Http\Controllers\Concerns\ValidatesThreeDModelUploads;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ThreeDAssetService
{
    use HandlesThreeDModelBundles;
    use ValidatesThreeDModelUploads;

    private const MAX_THREE_D_STORAGE_BYTES = 524288000;

    /**
     * Get the validation rules for 3D model upload
     *
     * @param bool $required
     * @return array
     */
    public function getUploadRules(bool $required = false): array
    {
        return $this->threeDModelUploadRules($required);
    }

    /**
     * Get companion asset rules
     *
     * @return array
     */
    public function getAssetRules(): array
    {
        return $this->threeDModelAssetRules();
    }

    /**
     * Validate and store the 3D model bundle, and return the path
     *
     * @param Request $request
     * @param int $sellerId
     * @param string|null $replacedPath
     * @return string|null
     */
    public function validateAndStore(Request $request, int $sellerId, ?string $replacedPath = null): ?string
    {
        if (!$request->hasFile('model_3d')) {
            return null;
        }

        $this->validateThreeDModelBundle($request);
        $incomingModelBytes = $this->getThreeDModelUploadSizeBytes($request);

        if (!$this->canStoreThreeDModel($sellerId, $incomingModelBytes, $replacedPath)) {
            throw ValidationException::withMessages([
                'model_3d' => 'Uploading this 3D model would exceed your 500MB 3D storage limit.'
            ]);
        }

        if ($replacedPath) {
            $this->deleteStoredThreeDModel($replacedPath);
        }

        return $this->storeThreeDModelBundle($request);
    }

    /**
     * Delete stored 3D model
     *
     * @param string|null $path
     * @return void
     */
    public function deleteModel(?string $path): void
    {
        $this->deleteStoredThreeDModel($path);
    }

    /**
     * Get stored 3D model size
     *
     * @param string|null $path
     * @return int
     */
    public function getModelSize(?string $path): int
    {
        return $this->getStoredThreeDModelSizeBytes($path);
    }

    /**
     * Check if the seller has enough remaining 3D storage
     *
     * @param int $sellerId
     * @param int $incomingBytes
     * @param string|null $replacedPath
     * @return bool
     */
    public function canStoreThreeDModel(int $sellerId, int $incomingBytes, ?string $replacedPath = null): bool
    {
        $currentUsage = Product::where('user_id', $sellerId)
            ->whereNotNull('model_3d_path')
            ->get()
            ->sum(fn (Product $product) => $this->getStoredThreeDModelSizeBytes($product->model_3d_path));

        if ($replacedPath) {
            $currentUsage -= $this->getStoredThreeDModelSizeBytes($replacedPath);
        }

        return ($currentUsage + $incomingBytes) <= self::MAX_THREE_D_STORAGE_BYTES;
    }
}
