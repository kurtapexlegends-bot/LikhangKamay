<?php

use App\Casts\PostgresCompatibleBoolean;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('platform_policies')) {
            return;
        }

        $now = now();
        $defaults = \App\Services\PolicyService::defaultPolicyDefinitions();

        foreach ($defaults as $type => $def) {
            $exists = DB::table('platform_policies')
                ->where('type', $type)
                ->exists();

            if ($exists) {
                continue;
            }

            DB::table('platform_policies')->insert([
                'type' => $type,
                'title' => $def['title'],
                'version' => $def['version'],
                'content_markdown' => $def['content_markdown'],
                'structured_criteria' => $def['structured_criteria'] !== null
                    ? json_encode($def['structured_criteria'], JSON_UNESCAPED_UNICODE)
                    : null,
                'is_active' => PostgresCompatibleBoolean::dbVal(true),
                'published_at' => $now,
                'created_by' => null,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('platform_policies')) {
            return;
        }

        DB::table('platform_policies')
            ->where('version', '1.0')
            ->whereNull('created_by')
            ->delete();
    }
};
