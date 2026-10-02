<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('seller_pickup_schedules', function (Blueprint $table) {
            if (!Schema::hasColumn('seller_pickup_schedules', 'schedule_mode')) {
                $table->string('schedule_mode', 20)->default('uniform')->after('is_enabled');
            }
            if (!Schema::hasColumn('seller_pickup_schedules', 'daily_time_slots')) {
                $table->json('daily_time_slots')->nullable()->after('time_slots');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('seller_pickup_schedules', function (Blueprint $table) {
            $columnsToDrop = array_filter([
                Schema::hasColumn('seller_pickup_schedules', 'schedule_mode') ? 'schedule_mode' : null,
                Schema::hasColumn('seller_pickup_schedules', 'daily_time_slots') ? 'daily_time_slots' : null,
            ]);

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
