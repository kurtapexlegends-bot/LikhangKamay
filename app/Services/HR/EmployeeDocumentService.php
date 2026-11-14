<?php

declare(strict_types=1);

namespace App\Services\HR;

use App\Models\Employee;
use App\Models\EmployeeDocument;
use App\Models\User;
use App\Services\StorageUrl;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

class EmployeeDocumentService
{
    public const SCHEMA_CACHE_KEY = 'schema_has_table_employee_documents';

    public const MAX_FILE_BYTES = 4 * 1024 * 1024;

    private const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

    private const ALLOWED_MIMES = [
        'image/jpeg',
        'image/png',
        'image/webp',
        'application/pdf',
    ];

    public static function supportsSchema(): bool
    {
        if (Cache::get(self::SCHEMA_CACHE_KEY) === true) {
            return true;
        }

        $exists = (bool) rescue(fn () => Schema::hasTable('employee_documents'), false);

        if ($exists) {
            Cache::put(self::SCHEMA_CACHE_KEY, true, 86400);
        }

        return $exists;
    }

    public static function forgetSchemaCache(): void
    {
        Cache::forget(self::SCHEMA_CACHE_KEY);
    }

    public static function privateDisk(): string
    {
        return StorageUrl::privateDisk();
    }

    /**
     * Persist an uploaded employee file to private storage and record metadata.
     *
     * @param array<string, mixed> $meta
     */
    public function storeUploadedFile(
        User $seller,
        User $actor,
        Employee $employee,
        UploadedFile $file,
        array $meta = []
    ): EmployeeDocument {
        $prepared = $this->prepareUploadedFilePayload($seller, $actor, $employee, $file, $meta);

        try {
            return DB::transaction(fn () => EmployeeDocument::create($prepared['attributes']));
        } catch (Throwable $e) {
            $this->deleteStoredFiles([$prepared['path']]);
            throw $e;
        }
    }

    /**
     * Persist a presigned direct-to-cloud employee file after server-side verification.
     *
     * @param array<string, mixed> $meta
     */
    public function storePresignedFile(
        User $seller,
        User $actor,
        Employee $employee,
        string $key,
        array $meta = []
    ): EmployeeDocument {
        $prepared = $this->preparePresignedFilePayload($seller, $actor, $employee, $key, $meta);

        try {
            return DB::transaction(fn () => EmployeeDocument::create($prepared['attributes']));
        } catch (Throwable $e) {
            $this->deleteStoredFiles([$prepared['path']]);
            throw $e;
        }
    }

    /**
     * Atomically store staged documents uploaded alongside initial employee creation.
     *
     * @param array<int, array<string, mixed>> $stagedDocuments
     */
    public function storeStagedDocuments(
        User $seller,
        User $actor,
        Employee $employee,
        array $stagedDocuments
    ): void {
        if (empty($stagedDocuments)) {
            return;
        }

        if (!self::supportsSchema()) {
            throw new \RuntimeException('Employee document storage is pending migration.');
        }

        $preparedPayloads = [];
        $batchPaths = [];

        try {
            foreach ($stagedDocuments as $entry) {
                if (!is_array($entry)) {
                    continue;
                }

                $meta = [
                    'document_type' => $entry['document_type'] ?? EmployeeDocument::TYPE_OTHER,
                    'title' => $entry['title'] ?? null,
                    'expires_at' => $entry['expires_at'] ?? null,
                    'notes' => $entry['notes'] ?? null,
                    'original_filename' => $entry['original_filename'] ?? null,
                ];

                $documentKey = $entry['document_key'] ?? null;
                $file = $entry['file'] ?? null;

                if (is_string($documentKey) && trim($documentKey) !== '') {
                    $prepared = $this->preparePresignedFilePayload($seller, $actor, $employee, trim($documentKey), $meta);
                } elseif ($file instanceof UploadedFile) {
                    $prepared = $this->prepareUploadedFilePayload($seller, $actor, $employee, $file, $meta);
                } else {
                    continue;
                }

                $batchPaths[] = $prepared['path'];
                $preparedPayloads[] = $prepared['attributes'];
            }

            if (empty($preparedPayloads)) {
                return;
            }

            DB::transaction(function () use ($preparedPayloads) {
                foreach ($preparedPayloads as $attributes) {
                    EmployeeDocument::create($attributes);
                }
            });
        } catch (Throwable $e) {
            $this->deleteStoredFiles($batchPaths);
            throw $e;
        }
    }

    /**
     * Build an authenticated inline or attachment streaming response for an employee document.
     */
    public function buildFileResponse(EmployeeDocument $document, bool $download = false): StreamedResponse
    {
        $path = ltrim((string) $document->file_path, '/');
        if ($path === '') {
            abort(404, 'Employee document file not found.');
        }

        $diskName = $this->resolveExistingDiskForPath($path);
        if (!$diskName) {
            abort(404, 'Employee document file not found.');
        }

        $disk = Storage::disk($diskName);
        $rawMime = (string) ($document->mime_type ?: rescue(fn () => $disk->mimeType($path), '', report: false));
        $isSafeInlineMime = in_array(strtolower($rawMime), self::ALLOWED_MIMES, true);

        $contentType = $isSafeInlineMime ? strtolower($rawMime) : 'application/octet-stream';
        $disposition = ($download || !$isSafeInlineMime) ? 'attachment' : 'inline';

        $filename = basename((string) ($document->original_filename ?: $path));
        $safeFilename = preg_replace('/[^A-Za-z0-9._-]/', '_', $filename) ?: 'document';

        return response()->stream(function () use ($disk, $path) {
            $stream = rescue(fn () => $disk->readStream($path), null, report: false);
            if (is_resource($stream)) {
                fpassthru($stream);
                fclose($stream);
                return;
            }

            $contents = $disk->get($path);
            if ($contents !== null) {
                echo $contents;
            }
        }, 200, [
            'Content-Type' => $contentType,
            'Content-Disposition' => $disposition . '; filename="' . $safeFilename . '"',
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store, max-age=0',
        ]);
    }

    /**
     * Remove an employee document record and clean up its stored file.
     */
    public function deleteDocument(User $seller, Employee $employee, EmployeeDocument $document): void
    {
        abort_unless(
            $document->user_id === $seller->id && $document->employee_id === $employee->id,
            403,
            'Unauthorized employee document action.'
        );

        $filePath = $document->file_path;

        DB::transaction(function () use ($document) {
            $document->delete();
        });

        $this->deleteStoredFiles([$filePath]);
    }

    /**
     * Delete all document DB records for an employee inside an active transaction and return their paths.
     *
     * @return array<int, string>
     */
    public function deleteAllRecordsForEmployee(Employee $employee): array
    {
        if (!self::supportsSchema()) {
            return [];
        }

        $paths = $employee->documents()
            ->pluck('file_path')
            ->filter(fn ($path) => is_string($path) && $path !== '')
            ->values()
            ->all();

        $employee->documents()->delete();

        return $paths;
    }

    /**
     * Delete stored files from private storage (and legacy public disk if present).
     *
     * @param array<int, string|null> $paths
     */
    public function deleteStoredFiles(array $paths): void
    {
        $privateDisk = self::privateDisk();
        $publicDisk = StorageUrl::disk();

        foreach ($paths as $path) {
            if (!is_string($path) || trim($path) === '') {
                continue;
            }

            StorageUrl::delete($path, $privateDisk);
            if ($publicDisk !== $privateDisk) {
                StorageUrl::delete($path, $publicDisk);
            }
        }
    }

    /**
     * @param array<string, mixed> $meta
     * @return array{path: string, attributes: array<string, mixed>}
     */
    private function prepareUploadedFilePayload(
        User $seller,
        User $actor,
        Employee $employee,
        UploadedFile $file,
        array $meta
    ): array {
        [$documentType, $title] = $this->resolveDocumentMetadata($meta);

        $extension = strtolower((string) ($file->getClientOriginalExtension() ?: $file->guessExtension() ?: 'bin'));
        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw ValidationException::withMessages([
                'document' => ['Accepted formats are JPG, PNG, WEBP, and PDF.'],
            ]);
        }

        $serverMime = $this->resolveServerMimeType($file);
        if ($serverMime !== null && !in_array(strtolower($serverMime), self::ALLOWED_MIMES, true)) {
            throw ValidationException::withMessages([
                'document' => ['The uploaded file content does not match an accepted image or PDF format.'],
            ]);
        }

        $directory = "employee_documents/{$seller->id}/{$employee->id}";
        $filename = Str::uuid()->toString() . '.' . $extension;
        $storedPath = $file->storeAs($directory, $filename, self::privateDisk());

        if (!$storedPath) {
            throw new \RuntimeException('Failed to store employee document file.');
        }

        return [
            'path' => $storedPath,
            'attributes' => [
                'employee_id' => $employee->id,
                'user_id' => $seller->id,
                'uploaded_by_user_id' => $actor->id,
                'document_type' => $documentType,
                'title' => $title,
                'file_path' => $storedPath,
                'original_filename' => basename((string) ($file->getClientOriginalName() ?: $storedPath)),
                'mime_type' => $serverMime ?: $this->fallbackMimeForExtension($extension),
                'file_size' => (int) ($file->getSize() ?? 0),
                'expires_at' => !empty($meta['expires_at']) ? $meta['expires_at'] : null,
                'notes' => isset($meta['notes']) && trim((string) $meta['notes']) !== '' ? trim((string) $meta['notes']) : null,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $meta
     * @return array{path: string, attributes: array<string, mixed>}
     */
    private function preparePresignedFilePayload(
        User $seller,
        User $actor,
        Employee $employee,
        string $key,
        array $meta
    ): array {
        [$documentType, $title] = $this->resolveDocumentMetadata($meta);

        $expectedPrefix = "employee_documents/{$seller->id}/";
        if (str_contains($key, '..') || !str_starts_with($key, $expectedPrefix)) {
            throw ValidationException::withMessages([
                'document_key' => ['Invalid employee document storage reference.'],
            ]);
        }

        $extension = strtolower(pathinfo($key, PATHINFO_EXTENSION));
        if (!in_array($extension, self::ALLOWED_EXTENSIONS, true)) {
            throw ValidationException::withMessages([
                'document_key' => ['Accepted formats are JPG, PNG, WEBP, and PDF.'],
            ]);
        }

        if (EmployeeDocument::where('file_path', $key)->exists()) {
            throw ValidationException::withMessages([
                'document_key' => ['This uploaded document reference has already been attached.'],
            ]);
        }

        $disk = Storage::disk(self::privateDisk());
        if (!$disk->exists($key)) {
            throw ValidationException::withMessages([
                'document_key' => ['Uploaded file could not be found in secure storage. Please upload again.'],
            ]);
        }

        $fileSize = (int) rescue(fn () => $disk->size($key), 0, report: false);
        if ($fileSize <= 0 || $fileSize > self::MAX_FILE_BYTES) {
            $this->deleteStoredFiles([$key]);
            throw ValidationException::withMessages([
                'document_key' => ['Document size must be between 1 byte and 4MB.'],
            ]);
        }

        $detectedMime = $this->resolveStoredObjectMimeType($disk, $key);
        if ($detectedMime !== null && !in_array(strtolower($detectedMime), self::ALLOWED_MIMES, true)) {
            $this->deleteStoredFiles([$key]);
            throw ValidationException::withMessages([
                'document_key' => ['Uploaded file content does not match an accepted image or PDF format.'],
            ]);
        }

        $originalFilename = basename((string) (!empty($meta['original_filename']) ? $meta['original_filename'] : $key));

        return [
            'path' => $key,
            'attributes' => [
                'employee_id' => $employee->id,
                'user_id' => $seller->id,
                'uploaded_by_user_id' => $actor->id,
                'document_type' => $documentType,
                'title' => $title,
                'file_path' => $key,
                'original_filename' => $originalFilename,
                'mime_type' => $detectedMime ?: $this->fallbackMimeForExtension($extension),
                'file_size' => $fileSize,
                'expires_at' => !empty($meta['expires_at']) ? $meta['expires_at'] : null,
                'notes' => isset($meta['notes']) && trim((string) $meta['notes']) !== '' ? trim((string) $meta['notes']) : null,
            ],
        ];
    }

    /**
     * @param array<string, mixed> $meta
     * @return array{0: string, 1: string}
     */
    private function resolveDocumentMetadata(array $meta): array
    {
        $documentType = (string) ($meta['document_type'] ?? EmployeeDocument::TYPE_OTHER);
        $types = EmployeeDocument::documentTypes();
        if (!array_key_exists($documentType, $types)) {
            $documentType = EmployeeDocument::TYPE_OTHER;
        }

        $rawTitle = trim((string) ($meta['title'] ?? ''));
        $title = $rawTitle !== '' ? $rawTitle : $types[$documentType];

        return [$documentType, $title];
    }

    private function resolveServerMimeType(UploadedFile $file): ?string
    {
        $serverMime = rescue(fn () => $file->getMimeType(), null, report: false);
        if (is_string($serverMime) && $serverMime !== '' && !in_array($serverMime, ['application/x-empty', 'inode/x-empty'], true)) {
            return $serverMime;
        }

        $clientMime = $file->getClientMimeType();
        return is_string($clientMime) && $clientMime !== '' ? $clientMime : null;
    }

    private function resolveStoredObjectMimeType(\Illuminate\Contracts\Filesystem\Filesystem $disk, string $key): ?string
    {
        $magicMime = $this->sniffStoredMagicMime($disk, $key);
        if ($magicMime !== null) {
            return $magicMime;
        }

        $mime = rescue(fn () => $disk->mimeType($key), null, report: false);
        if (is_string($mime) && $mime !== '' && !in_array($mime, ['application/x-empty', 'inode/x-empty', 'application/octet-stream'], true)) {
            return $mime;
        }

        return null;
    }

    private function sniffStoredMagicMime(\Illuminate\Contracts\Filesystem\Filesystem $disk, string $key): ?string
    {
        $head = rescue(function () use ($disk, $key) {
            $stream = $disk->readStream($key);
            if (is_resource($stream)) {
                $bytes = fread($stream, 16);
                fclose($stream);
                return is_string($bytes) ? $bytes : '';
            }

            $contents = $disk->get($key);
            return is_string($contents) ? substr($contents, 0, 16) : '';
        }, '', report: false);

        if ($head === '') {
            return null;
        }

        if (str_starts_with($head, '%PDF-')) {
            return 'application/pdf';
        }
        if (str_starts_with($head, "\x89PNG\r\n\x1a\n")) {
            return 'image/png';
        }
        if (str_starts_with($head, "\xFF\xD8\xFF")) {
            return 'image/jpeg';
        }
        if (strlen($head) >= 12 && substr($head, 0, 4) === 'RIFF' && substr($head, 8, 4) === 'WEBP') {
            return 'image/webp';
        }

        return 'application/octet-stream';
    }

    private function fallbackMimeForExtension(string $extension): string
    {
        return match ($extension) {
            'jpg', 'jpeg' => 'image/jpeg',
            'png' => 'image/png',
            'webp' => 'image/webp',
            'pdf' => 'application/pdf',
            default => 'application/octet-stream',
        };
    }

    private function resolveExistingDiskForPath(string $path): ?string
    {
        $privateDisk = self::privateDisk();
        if (Storage::disk($privateDisk)->exists($path)) {
            return $privateDisk;
        }

        $publicDisk = StorageUrl::disk();
        if ($publicDisk !== $privateDisk && Storage::disk($publicDisk)->exists($path)) {
            return $publicDisk;
        }

        return null;
    }
}
