<?php

namespace App\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * @method static mixed get(string $key, mixed $default = null)
 * @method static \App\Models\PlatformVariable set(string $key, mixed $value, string $type = 'string', ?string $description = null)
 * 
 * @see \App\Services\SystemSettingsService
 */
class Settings extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'system.settings';
    }
}
