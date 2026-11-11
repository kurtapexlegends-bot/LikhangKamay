<?php

declare(strict_types=1);

namespace App\Support;

class RevisionSchemaRegistry
{
    /**
     * Retrieve a full schema definition by key.
     */
    public static function schemaFor(string $schemaKey): array
    {
        $schema = config("revisions.schemas.{$schemaKey}");

        return is_array($schema) ? $schema : ['title' => 'Requested Revisions', 'fields' => []];
    }

    /**
     * Retrieve the configured selectable fields for a schema key.
     */
    public static function fieldsFor(string $schemaKey): array
    {
        return self::schemaFor($schemaKey)['fields'] ?? [];
    }

    /**
     * Retrieve all declarative revision schemas.
     */
    public static function allSchemas(): array
    {
        return config('revisions.schemas', []);
    }

    /**
     * Normalize, sanitize, and enrich submitted revision items against the schema registry.
     * Supports both predefined fields and reviewer-defined custom items.
     */
    public static function normalizeItems(string $schemaKey, array $rawItems): array
    {
        $schemaMap = collect(self::fieldsFor($schemaKey))->keyBy('key');
        $normalized = [];
        $seenKeys = [];

        foreach ($rawItems as $item) {
            if (is_string($item)) {
                $key = trim(strip_tags($item));
                $note = '';
                $customLabel = null;
            } elseif (is_array($item)) {
                $key = trim(strip_tags((string) ($item['key'] ?? '')));
                $note = trim(strip_tags((string) ($item['note'] ?? '')));
                $customLabel = isset($item['label']) ? trim(strip_tags((string) $item['label'])) : null;
            } else {
                continue;
            }

            if ($key === '' || isset($seenKeys[$key])) {
                continue;
            }

            $seenKeys[$key] = true;
            $registered = $schemaMap->get($key);

            $label = $registered['label'] ?? ($customLabel ?: ucwords(str_replace(['_', '-'], ' ', $key)));
            $label = mb_substr($label, 0, 120);
            $note = mb_substr($note, 0, 500);

            $normalized[] = [
                'key' => mb_substr($key, 0, 80),
                'label' => $label,
                'group' => $registered['group'] ?? 'Custom',
                'note' => $note !== '' ? $note : null,
                'is_custom' => $registered === null,
                'resolved' => false,
            ];
        }

        return $normalized;
    }

    /**
     * Generate a concise human-readable summary string for legacy plain-text columns and emails.
     */
    public static function formatSummaryString(array $normalizedItems, ?string $summaryNote = null): string
    {
        $summaryNote = trim(strip_tags((string) $summaryNote));
        $parts = [];

        if (!empty($normalizedItems)) {
            $itemStrings = array_map(function (array $item): string {
                return !empty($item['note'])
                    ? "{$item['label']} ({$item['note']})"
                    : $item['label'];
            }, $normalizedItems);

            $parts[] = 'Items to revise: ' . implode(', ', $itemStrings) . '.';
        }

        if ($summaryNote !== '') {
            $parts[] = $summaryNote;
        }

        return implode(' ', $parts);
    }

    /**
     * Snapshot the current field value of a model for revision diffing.
     */
    public static function snapshotField(object $model, string $schemaKey, string $fieldKey): mixed
    {
        if ($schemaKey === 'artisan_kyc') {
            return match ($fieldKey) {
                'shop_details' => [
                    'shop_name' => trim((string) ($model->shop_name ?? '')),
                    'phone_number' => trim((string) ($model->phone_number ?? '')),
                ],
                'shop_address' => [
                    'street_address' => trim((string) ($model->street_address ?? '')),
                    'city' => trim((string) ($model->city ?? '')),
                    'barangay' => trim((string) ($model->barangay ?? '')),
                    'zip_code' => trim((string) ($model->zip_code ?? '')),
                    'latitude' => $model->latitude !== null ? (string) $model->latitude : null,
                    'longitude' => $model->longitude !== null ? (string) $model->longitude : null,
                ],
                'business_permit' => trim((string) ($model->business_permit ?? '')),
                'dti_registration' => trim((string) ($model->dti_registration ?? '')),
                'valid_id' => trim((string) ($model->valid_id ?? '')),
                'tin_id' => trim((string) ($model->tin_id ?? '')),
                'face_verification' => [
                    'selfie' => trim((string) ($model->kyc_selfie_path ?? '')),
                    'liveness' => $model->kyc_liveness_verified_at ? (string) $model->kyc_liveness_verified_at : null,
                ],
                'payout_info' => [
                    'method' => strtolower(trim((string) ($model->payout_method ?? ''))),
                    'account_name' => trim((string) ($model->payout_account_name ?? '')),
                    'account_number' => trim((string) ($model->payout_account_number ?? '')),
                ],
                default => null,
            };
        }

        if ($schemaKey === 'product') {
            return match ($fieldKey) {
                'basic_info' => [
                    'name' => trim((string) ($model->name ?? '')),
                    'category' => trim((string) ($model->category ?? '')),
                ],
                'description' => trim((string) ($model->description ?? '')),
                'pricing_stock' => [
                    'price' => $model->price !== null ? (string) $model->price : '',
                    'cost_price' => $model->cost_price !== null ? (string) $model->cost_price : '',
                    'stock' => $model->stock !== null ? (string) $model->stock : '',
                    'weight' => $model->weight !== null ? (string) $model->weight : '',
                ],
                'cover_media' => [
                    'cover' => trim((string) ($model->cover_photo_path ?? '')),
                    'gallery' => is_array($model->gallery_paths) ? array_values($model->gallery_paths) : [],
                ],
                'model_3d' => trim((string) ($model->model_3d_path ?? '')),
                'materials_bom' => [
                    'production_method' => (string) ($model->production_method ?? 'resell'),
                    'track_as_supply' => (bool) ($model->track_as_supply ?? false),
                    'recipes' => method_exists($model, 'relationLoaded') && $model->relationLoaded('recipes')
                        ? $model->recipes->map(fn ($r) => ['supply_id' => (string) $r->supply_id, 'qty' => (string) $r->quantity_required])->values()->all()
                        : [],
                ],
                default => null,
            };
        }

        return null;
    }

    /**
     * Attach field snapshots to each normalized revision item.
     */
    public static function attachSnapshots(object $model, string $schemaKey, array $normalizedItems): array
    {
        foreach ($normalizedItems as &$item) {
            $key = $item['key'] ?? '';
            if ($key !== '') {
                $item['snapshot'] = self::snapshotField($model, $schemaKey, $key);
            }
        }
        unset($item);

        return $normalizedItems;
    }

    /**
     * Compare a model's current field value against a recorded snapshot.
     * Returns true if changed, false if unchanged.
     */
    public static function compareField(object $model, string $schemaKey, string $fieldKey, mixed $snapshot): bool
    {
        if ($snapshot === null) {
            return false;
        }

        $current = self::snapshotField($model, $schemaKey, $fieldKey);
        if ($current === null) {
            return false;
        }

        return $current != $snapshot;
    }

    /**
     * Generate concise change summary text for reviewers.
     */
    public static function summarizeChange(string $schemaKey, string $fieldKey, bool $isChanged = true): string
    {
        return match ($fieldKey) {
            'business_permit', 'dti_registration', 'valid_id', 'tin_id' => 'New document uploaded',
            'face_verification' => 'New live selfie captured',
            'shop_details' => 'Shop details updated',
            'shop_address' => 'Workshop address/pin updated',
            'payout_info' => 'Payout details updated',
            'cover_media', 'product_media' => 'Media assets updated',
            'model_3d' => '3D model file updated',
            'basic_info' => 'Title / category updated',
            'description' => 'Description updated',
            'pricing_stock' => 'Price / inventory updated',
            'materials_bom' => 'Materials recipe updated',
            default => 'Updated in resubmission',
        };
    }
}
