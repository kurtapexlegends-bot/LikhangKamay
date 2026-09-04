<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'driver_license_photo_path')) {
                $table->string('driver_license_photo_path')->nullable()->after('driver_license_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (Schema::hasColumn('employees', 'driver_license_photo_path')) {
                $table->dropColumn('driver_license_photo_path');
            }
        });
    }
};
