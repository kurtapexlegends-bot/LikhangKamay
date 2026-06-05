<?php

namespace App\Services;

use App\Models\PlatformVariable;
use Illuminate\Support\Facades\Cache;

class SystemSettingsService
{
    /**
     * Get all platform settings cached.
     *
     * @return array<string, array{value: string, type: string}>
     */
    protected function getAllSettings(): array
    {
        return Cache::remember('all_platform_settings', 3600, function () {
            return PlatformVariable::all()->mapWithKeys(function ($variable) {
                return [$variable->key => [
                    'value' => $variable->value,
                    'type' => $variable->type,
                ]];
            })->toArray();
        });
    }

    /**
     * Get a setting value by key with caching and default fallback.
     */
    public function get(string $key, mixed $default = null): mixed
    {
        $all = $this->getAllSettings();

        if (!array_key_exists($key, $all)) {
            return $default;
        }

        return $this->castValue($all[$key]['value'], $all[$key]['type']);
    }

    /**
     * Set/Update a setting value.
     */
    public function set(string $key, mixed $value, string $type = 'string', ?string $description = null): PlatformVariable
    {
        $dbValue = (is_array($value) || is_object($value)) ? json_encode($value) : (string) $value;

        $variable = PlatformVariable::updateOrCreate(
            ['key' => $key],
            [
                'value' => $dbValue,
                'type' => $type,
                'description' => $description ?? PlatformVariable::where('key', $key)->value('description')
            ]
        );

        Cache::forget('all_platform_settings');
        Cache::forget("platform_setting_{$key}");
        
        // Clear branding specific caches if needed
        if (in_array($key, ['platform_name', 'platform_logo'])) {
            Cache::forget($key);
        }

        return $variable;
    }

    /**
     * Cast the string value from DB to its intended type.
     */
    protected function castValue(string $value, string $type): mixed
    {
        return match ($type) {
            'integer', 'int' => (int) $value,
            'boolean', 'bool' => filter_var($value, FILTER_VALIDATE_BOOLEAN),
            'json', 'array' => json_decode($value, true),
            'float', 'double', 'decimal' => (float) $value,
            default => $value,
        };
    }
}
