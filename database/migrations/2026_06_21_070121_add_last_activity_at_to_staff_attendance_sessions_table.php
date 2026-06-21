<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff_attendance_sessions', function (Blueprint $table) {
            $table->timestamp('last_activity_at')
                ->nullable()
                ->after('last_heartbeat_at');
        });

        // Initialize last_activity_at with existing last_heartbeat_at or clock_in_at
        DB::table("staff_attendance_sessions")
            ->update([
                'last_activity_at' => DB::raw('COALESCE(last_heartbeat_at, clock_in_at)'),
            ]);
    }

    public function down(): void
    {
        Schema::table('staff_attendance_sessions', function (Blueprint $table) {
            $table->dropColumn('last_activity_at');
        });
    }
};
