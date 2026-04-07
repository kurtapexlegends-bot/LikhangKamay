<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

trait HandlesThreeDModelBundles
{
    /**
     * @return array<string, array<int, mixed>>
     */
    protected function threeDModelAssetRules(string $assetsField = 'model_3d_assets', string $pathsField = 'model_3d_asset_paths'): array
    {
        return [
            $assetsField => ['nullable', 'array'],
            "{$assetsField}.*" => ['file', 'max:51200'],
            $pathsField => ['nullable', 'array'],
            "{$pathsField}.*" => ['nullable', 'string'],
        ];
    }

    protected function validateThreeDModelBundle(
        Request $request,
        string $modelField = 'model_3d',
        string $assetsField = 'model_3d_assets',
        string $pathsField = 'model_3d_asset_paths'
    ): void {
        $model = $request->file($modelField);

        if (!$model instanceof UploadedFile) {
            return;
        }

        if (strtolower((string) $model->getClientOriginalExtension()) !== 'gltf') {
            return;
        }

        $payload = json_decode((string) file_get_contents($model->getRealPath()), true);

        if (!is_array($payload)) {
            throw ValidationException::withMessages([
                $modelField => 'The selected .gltf file is invalid or unreadable.',
            ]);
        }

        $requiredAssets = collect($this->extractReferencedThreeDAssetPaths($payload))
            ->map(fn ($path) => $this->normalizeThreeDAssetRelativePath($path))
            ->filter()
            ->unique()
            ->values();

        if ($requiredAssets->isEmpty()) {
            return;
        }

        $providedAssets = collect($request->input($pathsField, []))
            ->map(fn ($path) => $this->resolveThreeDAssetPathForBundle((string) $path, $requiredAssets))
            ->filter()
            ->merge(
                collect($request->file($assetsField, []))
                    ->map(function ($file) use ($requiredAssets) {
                        if (!$file instanceof UploadedFile) {
                            return null;
                        }

                        return $this->resolveThreeDAssetPathForBundle((string) $file->getClientOriginalName(), $requiredAssets);
                    })
                    ->filter()
            )
            ->unique()
            ->values();

        $missingAssets = $requiredAssets
            ->reject(fn ($path) => $providedAssets->contains($path))
            ->values();

        if ($missingAssets->isEmpty()) {
            return;
        }

        $missingLabel = $missingAssets->take(3)->implode(', ');
        $suffix = $missingAssets->count() > 3 ? ', ...' : '';

        throw ValidationException::withMessages([
            $assetsField => "This .gltf file needs companion files ({$missingLabel}{$suffix}). Upload the matching asset folder too.",
        ]);
    }

    protected function getThreeDModelUploadSizeBytes(
        Request $request,
        string $modelField = 'model_3d',
        string $assetsField = 'model_3d_assets'
    ): int {
        $totalBytes = 0;

        $model = $request->file($modelField);
        if ($model instanceof UploadedFile) {
            $totalBytes += (int) $model->getSize();
        }

        foreach ($request->file($assetsField, []) as $asset) {
            if ($asset instanceof UploadedFile) {
                $totalBytes += (int) $asset->getSize();
            }
        }

        return $totalBytes;
    }

    protected function storeThreeDModelBundle(
        Request $request,
        string $modelField = 'model_3d',
        string $assetsField = 'model_3d_assets',
        string $pathsField = 'model_3d_asset_paths',
        string $baseDirectory = 'products/models'
    ): string {
        /** @var UploadedFile|null $model */
        $model = $request->file($modelField);

        if (!$model instanceof UploadedFile) {
            throw ValidationException::withMessages([
                $modelField => 'No 3D model file was uploaded.',
            ]);
        }

        $extension = strtolower((string) $model->getClientOriginalExtension());

        if ($extension === 'glb') {
            return $model->store(trim($baseDirectory, '/'), 'public');
        }

        $payload = json_decode((string) file_get_contents($model->getRealPath()), true);
        $requiredAssets = is_array($payload)
            ? collect($this->extractReferencedThreeDAssetPaths($payload))
                ->map(fn ($path) => $this->normalizeThreeDAssetRelativePath($path))
                ->filter()
                ->unique()
                ->values()
            : collect();

        $bundleDirectory = trim($baseDirectory, '/') . '/' . Str::ulid();
        $mainFilename = $this->sanitizeThreeDModelFilename(
            (string) $model->getClientOriginalName(),
            'model.gltf'
        );

        Storage::disk('public')->putFileAs($bundleDirectory, $model, $mainFilename);

        $assetFiles = $request->file($assetsField, []);
        $assetPaths = $request->input($pathsField, []);

        foreach ($assetFiles as $index => $asset) {
            if (!$asset instanceof UploadedFile) {
                continue;
            }

            $relativePath = $this->resolveThreeDAssetPathForBundle(
                (string) ($assetPaths[$index] ?? $asset->getClientOriginalName()),
                $requiredAssets
            );

            if (!$relativePath || $relativePath === $mainFilename) {
                continue;
            }

            $targetPath = $bundleDirectory . '/' . $relativePath;
            $targetDirectory = dirname($targetPath);

            Storage::disk('public')->putFileAs(
                $targetDirectory === '.' ? $bundleDirectory : $targetDirectory,
                $asset,
                basename($relativePath)
            );
        }

        return $bundleDirectory . '/' . $mainFilename;
    }

    protected function deleteStoredThreeDModel(?string $path): void
    {
        $normalizedPath = trim((string) $path, '/');

        if ($normalizedPath === '') {
            return;
        }

        $bundleDirectory = $this->resolveThreeDModelBundleDirectory($normalizedPath);

        if ($bundleDirectory) {
            Storage::disk('public')->deleteDirectory($bundleDirectory);
            return;
        }

        Storage::disk('public')->delete($normalizedPath);
    }

    protected function getStoredThreeDModelSizeBytes(?string $path): int
    {
        $normalizedPath = trim((string) $path, '/');

        if ($normalizedPath === '') {
            return 0;
        }

        $disk = Storage::disk('public');
        $bundleDirectory = $this->resolveThreeDModelBundleDirectory($normalizedPath);

        if ($bundleDirectory) {
            return collect($disk->allFiles($bundleDirectory))
                ->sum(fn ($file) => $disk->exists($file) ? (int) $disk->size($file) : 0);
        }

        return $disk->exists($normalizedPath) ? (int) $disk->size($normalizedPath) : 0;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int, string>
     */
    private function extractReferencedThreeDAssetPaths(array $payload): array
    {
        $paths = [];

        foreach ((array) ($payload['buffers'] ?? []) as $buffer) {
            if (!is_array($buffer) || !isset($buffer['uri'])) {
                continue;
            }

            $paths[] = (string) $buffer['uri'];
        }

        foreach ((array) ($payload['images'] ?? []) as $image) {
            if (!is_array($image) || !isset($image['uri'])) {
                continue;
            }

            $paths[] = (string) $image['uri'];
        }

        return array_values(array_filter($paths, function ($path) {
            return $path !== ''
                && !str_starts_with($path, 'data:')
                && !preg_match('/^https?:\/\//i', $path);
        }));
    }

    private function normalizeThreeDAssetRelativePath(?string $path): ?string
    {
        $normalized = str_replace('\\', '/', trim((string) $path));

        if ($normalized === '') {
            return null;
        }

        $segments = array_values(array_filter(explode('/', $normalized), function ($segment) {
            return $segment !== '' && $segment !== '.';
        }));

        if (empty($segments) || in_array('..', $segments, true)) {
            return null;
        }

        return implode('/', $segments);
    }

    private function sanitizeThreeDModelFilename(string $filename, string $fallback): string
    {
        $normalized = $this->normalizeThreeDAssetRelativePath($filename);

        return $normalized ? basename($normalized) : $fallback;
    }

    private function resolveThreeDAssetPathForBundle(string $path, Collection $requiredAssets): ?string
    {
        $normalized = $this->normalizeThreeDAssetRelativePath($path);

        if (!$normalized) {
            return null;
        }

        if ($requiredAssets->isEmpty() || $requiredAssets->contains($normalized)) {
            return $normalized;
        }

        $segments = explode('/', $normalized);

        while (count($segments) > 1) {
            array_shift($segments);
            $candidate = implode('/', $segments);

            if ($requiredAssets->contains($candidate)) {
                return $candidate;
            }
        }

        return $normalized;
    }

    private function resolveThreeDModelBundleDirectory(string $path): ?string
    {
        $segments = explode('/', $path);

        if (
            count($segments) === 4
            && $segments[0] === 'products'
            && $segments[1] === 'models'
        ) {
            return implode('/', array_slice($segments, 0, 3));
        }

        return null;
    }
}
