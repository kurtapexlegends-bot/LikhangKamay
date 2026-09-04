<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('order_deliveries', function (Blueprint $table) {
            if (!Schema::hasColumn('order_deliveries', 'driver_user_id')) {
                $table->foreignId('driver_user_id')->nullable()->after('order_id')->constrained('users')->nullOnDelete();
            }
            if (!Schema::hasColumn('order_deliveries', 'driver_employee_id')) {
                $table->foreignId('driver_employee_id')->nullable()->after('driver_user_id')->constrained('employees')->nullOnDelete();
            }
            if (!Schema::hasColumn('order_deliveries', 'driver_name')) {
                $table->string('driver_name')->nullable()->after('driver_employee_id');
            }
            if (!Schema::hasColumn('order_deliveries', 'driver_phone')) {
                $table->string('driver_phone')->nullable()->after('driver_name');
            }
            if (!Schema::hasColumn('order_deliveries', 'vehicle_type')) {
                $table->string('vehicle_type')->nullable()->after('driver_phone');
            }
            if (!Schema::hasColumn('order_deliveries', 'vehicle_plate_number')) {
                $table->string('vehicle_plate_number')->nullable()->after('vehicle_type');
            }
            if (!Schema::hasColumn('order_deliveries', 'dispatch_notes')) {
                $table->text('dispatch_notes')->nullable()->after('vehicle_plate_number');
            }
            if (!Schema::hasColumn('order_deliveries', 'dispatched_at')) {
                $table->timestamp('dispatched_at')->nullable()->after('dispatch_notes');
            }
            if (!Schema::hasColumn('order_deliveries', 'delivered_at')) {
                $table->timestamp('delivered_at')->nullable()->after('dispatched_at');
            }
            if (!Schema::hasColumn('order_deliveries', 'pod_photo_path')) {
                $table->string('pod_photo_path')->nullable()->after('delivered_at');
            }
            if (!Schema::hasColumn('order_deliveries', 'pod_notes')) {
                $table->text('pod_notes')->nullable()->after('pod_photo_path');
            }
        });

        Schema::table('order_deliveries', function (Blueprint $table) {
            $table->index(['driver_user_id', 'status'], 'order_deliveries_driver_user_status_idx');
            $table->index(['driver_employee_id', 'status'], 'order_deliveries_driver_emp_status_idx');
        });
    }

    public function down(): void
    {
        Schema::table('order_deliveries', function (Blueprint $table) {
            $table->dropIndex('order_deliveries_driver_user_status_idx');
            $table->dropIndex('order_deliveries_driver_emp_status_idx');

            if (Schema::hasColumn('order_deliveries', 'driver_user_id')) {
                $table->dropForeign(['driver_user_id']);
                $table->dropColumn('driver_user_id');
            }
            if (Schema::hasColumn('order_deliveries', 'driver_employee_id')) {
                $table->dropForeign(['driver_employee_id']);
                $table->dropColumn('driver_employee_id');
            }
            $columnsToDrop = [
                'driver_name',
                'driver_phone',
                'vehicle_type',
                'vehicle_plate_number',
                'dispatch_notes',
                'dispatched_at',
                'delivered_at',
                'pod_photo_path',
                'pod_notes',
            ];
            foreach ($columnsToDrop as $col) {
                if (Schema::hasColumn('order_deliveries', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};
