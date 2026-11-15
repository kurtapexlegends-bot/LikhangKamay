<?php

declare(strict_types=1);

use App\Casts\PostgresCompatibleBoolean;
use App\Models\PlatformPolicy;
use App\Services\PolicyService;
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
        $defaults = PolicyService::defaultPolicyDefinitions();

        $supplierTypes = [
            PlatformPolicy::TYPE_SUPPLIER_AGREEMENT,
            PlatformPolicy::TYPE_SUPPLIER_PRIVACY,
        ];

        foreach ($supplierTypes as $type) {
            if (!isset($defaults[$type])) {
                continue;
            }

            $exists = DB::table('platform_policies')
                ->where('type', $type)
                ->exists();

            if (!$exists) {
                $def = $defaults[$type];
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

        app(PolicyService::class)->clearPolicyCache();
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
            ->whereIn('type', [
                PlatformPolicy::TYPE_SUPPLIER_AGREEMENT,
                PlatformPolicy::TYPE_SUPPLIER_PRIVACY,
            ])
            ->delete();

        app(PolicyService::class)->clearPolicyCache();
    }
};
