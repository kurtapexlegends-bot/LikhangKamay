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
            $table->timestamp('last_heartbeat_at')
                ->nullable()
                ->after('clock_out_at');
            $table->string('close_reason')
                ->nullable()
                ->after('close_mode');

            $table->index(['clock_out_at', 'last_heartbeat_at']);
        });

        DB::table('staff_attendance_sessions')
            ->whereNull('last_heartbeat_at')
            ->update([
                'last_heartbeat_at' => DB::raw('COALESCE(clock_out_at, clock_in_at)'),
            ]);
    }

    public function down(): void
    {
        Schema::table('staff_attendance_sessions', function (Blueprint $table) {
            $table->dropIndex(['clock_out_at', 'last_heartbeat_at']);
            $table->dropColumn(['last_heartbeat_at', 'close_reason']);
        });
    }
};
