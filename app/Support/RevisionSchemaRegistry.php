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
}
