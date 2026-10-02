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
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'shift_schedule_mode')) {
                $table->string('shift_schedule_mode', 20)->default('uniform')->after('shift_end_time');
            }
            if (!Schema::hasColumn('users', 'daily_shifts')) {
                $table->json('daily_shifts')->nullable()->after('shift_schedule_mode');
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'shift_schedule_mode')) {
                $table->string('shift_schedule_mode', 20)->default('uniform')->after('shift_end_time');
            }
            if (!Schema::hasColumn('employees', 'daily_shifts')) {
                $table->json('daily_shifts')->nullable()->after('shift_schedule_mode');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columnsToDrop = array_filter([
                Schema::hasColumn('users', 'shift_schedule_mode') ? 'shift_schedule_mode' : null,
                Schema::hasColumn('users', 'daily_shifts') ? 'daily_shifts' : null,
            ]);

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });

        Schema::table('employees', function (Blueprint $table) {
            $columnsToDrop = array_filter([
                Schema::hasColumn('employees', 'shift_schedule_mode') ? 'shift_schedule_mode' : null,
                Schema::hasColumn('employees', 'daily_shifts') ? 'daily_shifts' : null,
            ]);

            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
