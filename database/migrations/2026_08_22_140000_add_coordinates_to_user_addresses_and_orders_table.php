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
        Schema::table('user_addresses', function (Blueprint $table) {
            if (!Schema::hasColumn('user_addresses', 'latitude')) {
                $table->decimal('latitude', 10, 8)->nullable()->after('full_address');
            }
            if (!Schema::hasColumn('user_addresses', 'longitude')) {
                $table->decimal('longitude', 11, 8)->nullable()->after('latitude');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'shipping_latitude')) {
                $table->decimal('shipping_latitude', 10, 8)->nullable()->after('shipping_postal_code');
            }
            if (!Schema::hasColumn('orders', 'shipping_longitude')) {
                $table->decimal('shipping_longitude', 11, 8)->nullable()->after('shipping_latitude');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('user_addresses', function (Blueprint $table) {
            if (Schema::hasColumn('user_addresses', 'longitude')) {
                $table->dropColumn('longitude');
            }
            if (Schema::hasColumn('user_addresses', 'latitude')) {
                $table->dropColumn('latitude');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'shipping_longitude')) {
                $table->dropColumn('shipping_longitude');
            }
            if (Schema::hasColumn('orders', 'shipping_latitude')) {
                $table->dropColumn('shipping_latitude');
            }
        });
    }
};
