<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_attendance_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('staff_attendance_sessions', 'clock_in_photo_path')) {
                $table->string('clock_in_photo_path')->nullable()->after('close_reason');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'clock_in_latitude')) {
                $table->decimal('clock_in_latitude', 10, 8)->nullable()->after('clock_in_photo_path');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'clock_in_longitude')) {
                $table->decimal('clock_in_longitude', 11, 8)->nullable()->after('clock_in_latitude');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'seller_location_id')) {
                $table->foreignId('seller_location_id')->nullable()->after('clock_in_longitude')->constrained('seller_locations')->nullOnDelete();
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'distance_meters')) {
                $table->unsignedInteger('distance_meters')->nullable()->after('seller_location_id');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'is_within_geofence')) {
                $table->boolean('is_within_geofence')->default(true)->after('distance_meters');
            }

            $table->index(['seller_location_id', 'is_within_geofence'], 'staff_att_loc_geofence_idx');
        });
    }

    public function down(): void
    {
        Schema::table('staff_attendance_sessions', function (Blueprint $table) {
            $table->dropIndex('staff_att_loc_geofence_idx');
            if (Schema::hasColumn('staff_attendance_sessions', 'seller_location_id')) {
                $table->dropForeign(['seller_location_id']);
            }
            $table->dropColumn(array_filter([
                Schema::hasColumn('staff_attendance_sessions', 'clock_in_photo_path') ? 'clock_in_photo_path' : null,
                Schema::hasColumn('staff_attendance_sessions', 'clock_in_latitude') ? 'clock_in_latitude' : null,
                Schema::hasColumn('staff_attendance_sessions', 'clock_in_longitude') ? 'clock_in_longitude' : null,
                Schema::hasColumn('staff_attendance_sessions', 'seller_location_id') ? 'seller_location_id' : null,
                Schema::hasColumn('staff_attendance_sessions', 'distance_meters') ? 'distance_meters' : null,
                Schema::hasColumn('staff_attendance_sessions', 'is_within_geofence') ? 'is_within_geofence' : null,
            ]));
        });
    }
};
