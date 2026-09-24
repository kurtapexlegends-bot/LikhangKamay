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
        if (DB::getDriverName() === 'pgsql') {
            $tables = ['orders', 'order_deliveries', 'notifications', 'messages', 'platform_activities'];

            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    DB::statement("ALTER TABLE {$table} ENABLE ROW LEVEL SECURITY;");
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            $tables = ['orders', 'order_deliveries', 'notifications', 'messages', 'platform_activities'];

            foreach ($tables as $table) {
                if (Schema::hasTable($table)) {
                    DB::statement("ALTER TABLE {$table} DISABLE ROW LEVEL SECURITY;");
                }
            }
        }
    }
};
