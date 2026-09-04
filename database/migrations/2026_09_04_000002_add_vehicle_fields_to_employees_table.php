<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            if (!Schema::hasColumn('employees', 'vehicle_type')) {
                $table->string('vehicle_type')->nullable()->default('Motorcycle')->after('role');
            }
            if (!Schema::hasColumn('employees', 'vehicle_plate_number')) {
                $table->string('vehicle_plate_number')->nullable()->after('vehicle_type');
            }
            if (!Schema::hasColumn('employees', 'driver_license_number')) {
                $table->string('driver_license_number')->nullable()->after('vehicle_plate_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('employees', function (Blueprint $table) {
            $columnsToDrop = ['vehicle_type', 'vehicle_plate_number', 'driver_license_number'];
            foreach ($columnsToDrop as $col) {
                if (Schema::hasColumn('employees', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
