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
            $table->string('current_session_id')->nullable()->after('remember_token');
            $table->string('current_device_uuid')->nullable()->after('current_session_id');
        });

        Schema::table('seller_locations', function (Blueprint $table) {
            $table->string('daily_workplace_pin', 10)->nullable()->after('enforce_strict_geofence');
            $table->timestamp('daily_pin_updated_at')->nullable()->after('daily_workplace_pin');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['current_session_id', 'current_device_uuid']);
        });

        Schema::table('seller_locations', function (Blueprint $table) {
            $table->dropColumn(['daily_workplace_pin', 'daily_pin_updated_at']);
        });
    }
};
