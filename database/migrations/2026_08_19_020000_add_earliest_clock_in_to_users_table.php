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
            if (!Schema::hasColumn('users', 'earliest_clock_in_minutes')) {
                $table->unsignedSmallInteger('earliest_clock_in_minutes')->default(30)->after('grace_period_minutes');
            }
            if (!Schema::hasColumn('users', 'enforce_strict_shift_window')) {
                $table->boolean('enforce_strict_shift_window')->default(true)->after('earliest_clock_in_minutes');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $columnsToDrop = [];
            if (Schema::hasColumn('users', 'earliest_clock_in_minutes')) {
                $columnsToDrop[] = 'earliest_clock_in_minutes';
            }
            if (Schema::hasColumn('users', 'enforce_strict_shift_window')) {
                $columnsToDrop[] = 'enforce_strict_shift_window';
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
