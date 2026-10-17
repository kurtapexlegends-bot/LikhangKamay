<?php

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
        if (Schema::hasTable('users') && Schema::hasColumn('users', 'setup_completed_at')) {
            $now = now()->toDateTimeString();
            DB::table('users')
                ->where('role', 'artisan')
                ->where('artisan_status', 'approved')
                ->whereNull('setup_completed_at')
                ->update([
                    'setup_completed_at' => DB::raw("COALESCE(approved_at, created_at, '{$now}')"),
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Additive data healing: no destructive rollback.
    }
};
