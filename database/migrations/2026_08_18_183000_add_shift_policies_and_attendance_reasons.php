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
            if (!Schema::hasColumn('users', 'shift_start_time')) {
                $table->string('shift_start_time', 10)->default('08:00')->nullable()->after('standard_workday_hours');
            }
            if (!Schema::hasColumn('users', 'shift_end_time')) {
                $table->string('shift_end_time', 10)->default('17:00')->nullable()->after('shift_start_time');
            }
            if (!Schema::hasColumn('users', 'grace_period_minutes')) {
                $table->unsignedSmallInteger('grace_period_minutes')->default(15)->after('shift_end_time');
            }
            if (!Schema::hasColumn('users', 'break_window_start')) {
                $table->string('break_window_start', 10)->default('11:30')->nullable()->after('grace_period_minutes');
            }
            if (!Schema::hasColumn('users', 'break_window_end')) {
                $table->string('break_window_end', 10)->default('13:30')->nullable()->after('break_window_start');
            }
            if (!Schema::hasColumn('users', 'break_allowance_minutes')) {
                $table->unsignedSmallInteger('break_allowance_minutes')->default(60)->after('break_window_end');
            }
        });

        Schema::table('staff_attendance_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('staff_attendance_sessions', 'is_late')) {
                $table->boolean('is_late')->default(false)->after('is_within_geofence');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'late_minutes')) {
                $table->unsignedSmallInteger('late_minutes')->default(0)->after('is_late');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'is_early_departure')) {
                $table->boolean('is_early_departure')->default(false)->after('late_minutes');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'early_departure_reason')) {
                $table->string('early_departure_reason', 255)->nullable()->after('is_early_departure');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'undertime_minutes')) {
                $table->unsignedSmallInteger('undertime_minutes')->default(0)->after('early_departure_reason');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'total_break_minutes')) {
                $table->unsignedSmallInteger('total_break_minutes')->default(0)->after('undertime_minutes');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'is_extended_break')) {
                $table->boolean('is_extended_break')->default(false)->after('total_break_minutes');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'liveness_verified')) {
                $table->boolean('liveness_verified')->default(false)->after('is_extended_break');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'shift_start_time',
                'shift_end_time',
                'grace_period_minutes',
                'break_window_start',
                'break_window_end',
                'break_allowance_minutes',
            ]);
        });

        Schema::table('staff_attendance_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'is_late',
                'late_minutes',
                'is_early_departure',
                'early_departure_reason',
                'undertime_minutes',
                'total_break_minutes',
                'is_extended_break',
                'liveness_verified',
            ]);
        });
    }
};
