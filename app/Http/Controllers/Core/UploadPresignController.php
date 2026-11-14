<?php

namespace App\Http\Controllers\Core;

use App\Http\Controllers\Controller;
use App\Services\StorageUrl;
use App\Support\HRWorkflowHelper;
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
        'employee_documents',
    ];

    private const ALLOWED_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'webp', 'pdf',
        'glb', 'gltf', 'bin',
    ];

    private const PRIVATE_DOCUMENT_EXTENSIONS = [
        'jpg', 'jpeg', 'png', 'webp', 'pdf',
    ];

    private const PRIVATE_DOCUMENT_CONTENT_TYPES = [
        'image/jpeg' => 'image/jpeg',
        'image/jpg' => 'image/jpeg',
        'image/png' => 'image/png',
        'image/webp' => 'image/webp',
        'application/pdf' => 'application/pdf',
    ];

    private const MAX_PRIVATE_DOCUMENT_BYTES = 4 * 1024 * 1024;

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
        $isPrivateDocument = $folder === 'employee_documents';

        if ($isPrivateDocument) {
            $user = $request->user();
            if (
                !$user
                || (!$user->canManageStaff() && !$user->canAccessSellerModule('hr'))
                || !HRWorkflowHelper::canEditHrRecords($user)
            ) {
                return response()->json([
                    'error' => 'Unauthorized to upload employee documents.',
                ], 403);
            }

            if (!in_array($extension, self::PRIVATE_DOCUMENT_EXTENSIONS, true)) {
                return response()->json([
                    'error' => 'Employee documents only allow JPG, PNG, WEBP, or PDF files.',
                ], 422);
            }
        } elseif (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            return response()->json([
                'error' => 'Unsupported file extension for direct upload.',
            ], 422);
        }

        $contentType = $validated['contentType'];
        if ($isPrivateDocument) {
            $normalizedMime = self::PRIVATE_DOCUMENT_CONTENT_TYPES[strtolower(trim($contentType))] ?? null;
            if (!$normalizedMime) {
                return response()->json([
                    'error' => 'Employee documents only allow JPEG, PNG, WEBP, or PDF content types.',
                ], 422);
            }
            $contentType = $normalizedMime;
        } elseif ($extension === 'glb') {
            $contentType = 'model/gltf-binary';
        } elseif ($extension === 'gltf') {
            $contentType = 'model/gltf+json';
        }

        if ($isPrivateDocument) {
            $sellerId = $request->user()->getEffectiveSellerId();
            $key = $folder . '/' . $sellerId . '/' . Str::uuid() . '.' . $extension;
            $diskName = StorageUrl::privateDisk();
        } else {
            $key = $folder . '/' . Str::uuid() . '.' . $extension;
            $diskName = 'public';
        }

        $driver = config("filesystems.disks.{$diskName}.driver");

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = Storage::disk($diskName);

        if ($driver === 's3') {
            $client = $disk->getClient();
            $bucket = config("filesystems.disks.{$diskName}.bucket");
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
            'disk' => $diskName,
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

        $isPrivateDocument = str_starts_with($key, 'employee_documents/');
        if ($isPrivateDocument) {
            $user = $request->user();
            $sellerId = $user?->getEffectiveSellerId();
            if (
                !$user
                || !$sellerId
                || (!$user->canManageStaff() && !$user->canAccessSellerModule('hr'))
                || !HRWorkflowHelper::canEditHrRecords($user)
                || !str_starts_with($key, 'employee_documents/' . $sellerId . '/')
            ) {
                return response()->json(['error' => 'Unauthorized storage key for employee documents.'], 403);
            }

            $extension = strtolower(pathinfo($key, PATHINFO_EXTENSION));
            if (!in_array($extension, self::PRIVATE_DOCUMENT_EXTENSIONS, true)) {
                return response()->json(['error' => 'Unsupported file extension for employee documents.'], 422);
            }
        }

        $content = $request->getContent();
        if ($content === false || $content === '') {
            return response()->json(['error' => 'No content received in upload stream.'], 400);
        }

        if ($isPrivateDocument && strlen($content) > self::MAX_PRIVATE_DOCUMENT_BYTES) {
            return response()->json(['error' => 'Employee document exceeds 4MB limit.'], 422);
        }

        $diskName = $isPrivateDocument ? StorageUrl::privateDisk() : 'public';
        Storage::disk($diskName)->put($key, $content);

        return response()->json([
            'success' => true,
            'key' => $key,
            'url' => $isPrivateDocument ? null : Storage::disk('public')->url($key),
        ]);
    }
}
