<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Cache::forget('all_platform_settings');
        Cache::forget('system_settings_all');
        Cache::forget('setting_contact_info');
        Cache::forget('platform_setting_contact_info');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
