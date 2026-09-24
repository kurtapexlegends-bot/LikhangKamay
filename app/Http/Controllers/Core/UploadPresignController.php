<?php

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class UploadPresignController extends Controller
{
    private const ALLOWED_FOLDERS = [
        'products',
        'products/models',
        'legal_docs',
        'returns',
        'shops',
        'avatars',
    ];

    private const ALLOWED_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'webp', 'pdf',
        'glb', 'gltf', 'bin',
    ];

    /**
     * Generate a presigned direct-to-cloud upload URL or local upload route.
     */
    public function presign(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'folder' => 'required|string|in:' . implode(',', self::ALLOWED_FOLDERS),
            'filename' => 'required|string|max:255',
            'contentType' => 'required|string|max:100',
        ]);

        $folder = trim($validated['folder'], '/');
        $filename = $validated['filename'];
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));

        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            return response()->json([
                'error' => 'Unsupported file extension for direct upload.',
            ], 422);
        }

        $contentType = $validated['contentType'];
        if ($extension === 'glb') {
            $contentType = 'model/gltf-binary';
        } elseif ($extension === 'gltf') {
            $contentType = 'model/gltf+json';
        }

        $key = $folder . '/' . Str::uuid() . '.' . $extension;
        $driver = config('filesystems.disks.public.driver');

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk('public');

        if ($driver === 's3') {
            $client = $disk->getClient();
            $bucket = config('filesystems.disks.public.bucket');
            $command = $client->getCommand('PutObject', [
                'Bucket' => $bucket,
                'Key' => $key,
                'ContentType' => $contentType,
            ]);
            $presignedRequest = $client->createPresignedRequest($command, '+20 minutes');
            $url = (string) $presignedRequest->getUri();
        } else {
            $url = route('api.uploads.local') . '?key=' . urlencode($key);
        }

        return response()->json([
            'url' => $url,
            'key' => $key,
            'contentType' => $contentType,
            'is_direct_cloud' => $driver === 's3',
        ]);
    }

    /**
     * Local storage streaming handler for local environment parity.
     */
    public function localUpload(Request $request): JsonResponse
    {
        $key = (string) $request->query('key');

        if (empty($key) || str_contains($key, '..') || str_starts_with($key, '/')) {
            return response()->json(['error' => 'Invalid or unsafe storage key.'], 400);
        }

        $isAllowed = false;
        foreach (self::ALLOWED_FOLDERS as $allowedFolder) {
            if (str_starts_with($key, $allowedFolder . '/')) {
                $isAllowed = true;
                break;
            }
        }

        if (!$isAllowed) {
            return response()->json(['error' => 'Storage key is outside allowed upload directories.'], 403);
        }

        $content = $request->getContent();
        if ($content === false || $content === '') {
            return response()->json(['error' => 'No content received in upload stream.'], 400);
        }

        Storage::disk('public')->put($key, $content);

        return response()->json([
            'success' => true,
            'key' => $key,
            'url' => Storage::disk('public')->url($key),
        ]);
    }
}
