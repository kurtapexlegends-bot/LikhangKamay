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
        Schema::table('order_deliveries', function (Blueprint $table) {
            if (!Schema::hasColumn('order_deliveries', 'current_latitude')) {
                $table->decimal('current_latitude', 10, 7)->nullable()->after('is_pod_enabled');
            }
            if (!Schema::hasColumn('order_deliveries', 'current_longitude')) {
                $table->decimal('current_longitude', 10, 7)->nullable()->after('current_latitude');
            }
            if (!Schema::hasColumn('order_deliveries', 'location_updated_at')) {
                $table->timestamp('location_updated_at')->nullable()->after('current_longitude');
            }
            if (!Schema::hasColumn('order_deliveries', 'heading')) {
                $table->smallInteger('heading')->nullable()->after('location_updated_at');
            }
            if (!Schema::hasColumn('order_deliveries', 'speed_kph')) {
                $table->decimal('speed_kph', 5, 2)->nullable()->after('heading');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('order_deliveries', function (Blueprint $table) {
            $columnsToDrop = [];
            foreach (['speed_kph', 'heading', 'location_updated_at', 'current_longitude', 'current_latitude'] as $col) {
                if (Schema::hasColumn('order_deliveries', $col)) {
                    $columnsToDrop[] = $col;
                }
            }
            if (!empty($columnsToDrop)) {
                $table->dropColumn($columnsToDrop);
            }
        });
    }
};
