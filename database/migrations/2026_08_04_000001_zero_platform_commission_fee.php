<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        DB::table('platform_variables')
            ->where('key', 'commission_rate')
            ->update([
                'value' => '0.00',
                'updated_at' => now(),
            ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        DB::table('platform_variables')
            ->where('key', 'commission_rate')
            ->update([
                'value' => '5.00',
                'updated_at' => now(),
            ]);
    }
};
