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
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'pickup_date')) {
                $table->date('pickup_date')->nullable()->after('shipping_method');
            }
            if (!Schema::hasColumn('orders', 'pickup_time_slot')) {
                $table->string('pickup_time_slot')->nullable()->after('pickup_date');
            }
            if (!Schema::hasColumn('orders', 'pickup_pin')) {
                $table->string('pickup_pin', 4)->nullable()->after('pickup_time_slot');
            }
            if (!Schema::hasColumn('orders', 'pickup_location_id')) {
                $table->foreignId('pickup_location_id')
                    ->nullable()
                    ->after('pickup_pin')
                    ->constrained('seller_locations')
                    ->nullOnDelete();
            }
            if (!Schema::hasColumn('orders', 'pickup_location_snapshot')) {
                $table->json('pickup_location_snapshot')->nullable()->after('pickup_location_id');
            }

            $table->index(['artisan_id', 'pickup_date'], 'orders_artisan_pickup_date_idx');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('orders_artisan_pickup_date_idx');

            if (Schema::hasColumn('orders', 'pickup_location_id')) {
                $table->dropForeign(['pickup_location_id']);
                $table->dropColumn('pickup_location_id');
            }
            if (Schema::hasColumn('orders', 'pickup_location_snapshot')) {
                $table->dropColumn('pickup_location_snapshot');
            }
            if (Schema::hasColumn('orders', 'pickup_pin')) {
                $table->dropColumn('pickup_pin');
            }
            if (Schema::hasColumn('orders', 'pickup_time_slot')) {
                $table->dropColumn('pickup_time_slot');
            }
            if (Schema::hasColumn('orders', 'pickup_date')) {
                $table->dropColumn('pickup_date');
            }
        });
    }
};
