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
            if (!Schema::hasColumn('seller_pickup_schedules', 'max_advance_days')) {
                $table->unsignedSmallInteger('max_advance_days')->default(30)->after('pickup_location_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('seller_pickup_schedules', function (Blueprint $table) {
            if (Schema::hasColumn('seller_pickup_schedules', 'max_advance_days')) {
                $table->dropColumn('max_advance_days');
            }
        });
    }
};
