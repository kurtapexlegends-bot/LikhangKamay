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
        Schema::table('staff_attendance_sessions', function (Blueprint $table) {
            if (!Schema::hasColumn('staff_attendance_sessions', 'is_flagged')) {
                $table->boolean('is_flagged')->default(false)->after('is_within_geofence');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'flag_reason')) {
                $table->string('flag_reason')->nullable()->after('is_flagged');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'approval_status')) {
                $table->string('approval_status')->default('approved')->after('flag_reason');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'approved_by_user_id')) {
                $table->foreignId('approved_by_user_id')->nullable()->after('approval_status')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'approved_at')) {
                $table->timestamp('approved_at')->nullable()->after('approved_by_user_id');
            }
            if (!Schema::hasColumn('staff_attendance_sessions', 'rejection_reason')) {
                $table->string('rejection_reason')->nullable()->after('approved_at');
            }

            $table->index(['approval_status', 'is_flagged'], 'staff_att_approval_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('staff_attendance_sessions', function (Blueprint $table) {
            $table->dropIndex('staff_att_approval_idx');
            if (Schema::hasColumn('staff_attendance_sessions', 'approved_by_user_id')) {
                $table->dropForeign(['approved_by_user_id']);
            }
            $table->dropColumn(array_filter([
                Schema::hasColumn('staff_attendance_sessions', 'is_flagged') ? 'is_flagged' : null,
                Schema::hasColumn('staff_attendance_sessions', 'flag_reason') ? 'flag_reason' : null,
                Schema::hasColumn('staff_attendance_sessions', 'approval_status') ? 'approval_status' : null,
                Schema::hasColumn('staff_attendance_sessions', 'approved_by_user_id') ? 'approved_by_user_id' : null,
                Schema::hasColumn('staff_attendance_sessions', 'approved_at') ? 'approved_at' : null,
                Schema::hasColumn('staff_attendance_sessions', 'rejection_reason') ? 'rejection_reason' : null,
            ]));
        });
    }
};
