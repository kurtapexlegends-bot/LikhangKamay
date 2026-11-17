<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (!Schema::hasTable('platform_variables')) {
            return;
        }

        $variables = [
            'tier_free_price' => ['value' => '349', 'type' => 'float', 'description' => 'Monthly subscription fee for Basic tier in PHP'],
            'tier_free_limit' => ['value' => '8', 'type' => 'integer', 'description' => 'Active product listing quota for Basic tier'],
            'tier_premium_price' => ['value' => '699', 'type' => 'float', 'description' => 'Monthly subscription fee for Premium tier in PHP'],
            'tier_premium_limit' => ['value' => '25', 'type' => 'integer', 'description' => 'Active product listing quota for Premium tier'],
            'tier_super_premium_price' => ['value' => '1299', 'type' => 'float', 'description' => 'Monthly subscription fee for Elite tier in PHP'],
            'tier_super_premium_limit' => ['value' => '75', 'type' => 'integer', 'description' => 'Active product listing quota for Elite tier'],
        ];

        foreach ($variables as $key => $data) {
            DB::table('platform_variables')->updateOrInsert(
                ['key' => $key],
                [
                    'value' => $data['value'],
                    'type' => $data['type'],
                    'description' => $data['description'],
                    'updated_at' => now(),
                ]
            );
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (!Schema::hasTable('platform_variables')) {
            return;
        }

        $reverts = [
            'tier_free_price' => '0',
            'tier_free_limit' => '3',
            'tier_premium_price' => '199',
            'tier_premium_limit' => '10',
            'tier_super_premium_price' => '399',
            'tier_super_premium_limit' => '50',
        ];

        foreach ($reverts as $key => $val) {
            DB::table('platform_variables')->where('key', $key)->update(['value' => $val, 'updated_at' => now()]);
        }
    }
};

