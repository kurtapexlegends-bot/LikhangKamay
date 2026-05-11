<?php

namespace App\Services;

use App\Models\PlatformVariable;
use Illuminate\Support\Facades\Cache;

class SystemSettingsService
{
    /**
     * Get a setting value by key with caching and default fallback.
     */
    public function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("platform_setting_{$key}", 3600, function () use ($key, $default) {
            $variable = PlatformVariable::where('key', $key)->first();
            
            if (!$variable) {
                return $default;
            }

            return $this->castValue($variable->value, $variable->type);
        });
    }

    /**
     * Set/Update a setting value.
     */
    public function set(string $key, mixed $value, string $type = 'string', ?string $description = null): PlatformVariable
    {
        $variable = PlatformVariable::updateOrCreate(
            ['key' => $key],
            [
                'value' => (string) $value,
                'type' => $type,
                'description' => $description ?? PlatformVariable::where('key', $key)->value('description')
            ]
        );

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
