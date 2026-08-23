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
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'schedule_type')) {
                $table->string('schedule_type', 20)->default('default')->after('assigned_location_id');
            }
            if (!Schema::hasColumn('employees', 'working_days')) {
                $table->json('working_days')->nullable()->after('schedule_type');
            }
            if (!Schema::hasColumn('employees', 'shift_start_time')) {
                $table->string('shift_start_time', 10)->nullable()->after('working_days');
            }
            if (!Schema::hasColumn('employees', 'shift_end_time')) {
                $table->string('shift_end_time', 10)->nullable()->after('shift_start_time');
            }
            if (!Schema::hasColumn('employees', 'break_window_start')) {
                $table->string('break_window_start', 10)->nullable()->after('shift_end_time');
            }
            if (!Schema::hasColumn('employees', 'break_window_end')) {
                $table->string('break_window_end', 10)->nullable()->after('break_window_start');
            }
            if (!Schema::hasColumn('employees', 'break_allowance_minutes')) {
                $table->unsignedSmallInteger('break_allowance_minutes')->nullable()->after('break_window_end');
            }
            if (!Schema::hasColumn('employees', 'grace_period_minutes')) {
                $table->unsignedSmallInteger('grace_period_minutes')->nullable()->after('break_allowance_minutes');
            }
            if (!Schema::hasColumn('employees', 'earliest_clock_in_minutes')) {
                $table->unsignedSmallInteger('earliest_clock_in_minutes')->nullable()->after('grace_period_minutes');
            }
            if (!Schema::hasColumn('employees', 'standard_workday_hours')) {
                $table->decimal('standard_workday_hours', 4, 2)->nullable()->after('earliest_clock_in_minutes');
            }
            if (!Schema::hasColumn('employees', 'enforce_strict_shift_window')) {
                $table->boolean('enforce_strict_shift_window')->nullable()->after('standard_workday_hours');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $columnsToDrop = array_filter([
                Schema::hasColumn('employees', 'schedule_type') ? 'schedule_type' : null,
                Schema::hasColumn('employees', 'working_days') ? 'working_days' : null,
                Schema::hasColumn('employees', 'shift_start_time') ? 'shift_start_time' : null,
                Schema::hasColumn('employees', 'shift_end_time') ? 'shift_end_time' : null,
                Schema::hasColumn('employees', 'break_window_start') ? 'break_window_start' : null,
                Schema::hasColumn('employees', 'break_window_end') ? 'break_window_end' : null,
                Schema::hasColumn('employees', 'break_allowance_minutes') ? 'break_allowance_minutes' : null,
                Schema::hasColumn('employees', 'grace_period_minutes') ? 'grace_period_minutes' : null,
                Schema::hasColumn('employees', 'earliest_clock_in_minutes') ? 'earliest_clock_in_minutes' : null,
                Schema::hasColumn('employees', 'standard_workday_hours') ? 'standard_workday_hours' : null,
                Schema::hasColumn('employees', 'enforce_strict_shift_window') ? 'enforce_strict_shift_window' : null,
            ]);

            if (!empty($columnsToDrop)) {
                $table->dropColumn(array_values($columnsToDrop));
            }
        });
    }
};
