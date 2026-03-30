<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'barangay')) {
                $table->string('barangay')->nullable()->after('city');
            }

            if (!Schema::hasColumn('users', 'region')) {
                $table->string('region')->nullable()->after('barangay');
            }
        });

        Schema::table('user_addresses', function (Blueprint $table) {
            if (!Schema::hasColumn('user_addresses', 'street_address')) {
                $table->string('street_address')->nullable()->after('phone_number');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'shipping_street_address')) {
                $table->string('shipping_street_address')->nullable()->after('shipping_address');
            }

            if (!Schema::hasColumn('orders', 'shipping_barangay')) {
                $table->string('shipping_barangay')->nullable()->after('shipping_street_address');
            }

            if (!Schema::hasColumn('orders', 'shipping_city')) {
                $table->string('shipping_city')->nullable()->after('shipping_barangay');
            }

            if (!Schema::hasColumn('orders', 'shipping_region')) {
                $table->string('shipping_region')->nullable()->after('shipping_city');
            }

            if (!Schema::hasColumn('orders', 'shipping_postal_code')) {
                $table->string('shipping_postal_code')->nullable()->after('shipping_region');
            }
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $columns = array_filter([
                Schema::hasColumn('orders', 'shipping_postal_code') ? 'shipping_postal_code' : null,
                Schema::hasColumn('orders', 'shipping_region') ? 'shipping_region' : null,
                Schema::hasColumn('orders', 'shipping_city') ? 'shipping_city' : null,
                Schema::hasColumn('orders', 'shipping_barangay') ? 'shipping_barangay' : null,
                Schema::hasColumn('orders', 'shipping_street_address') ? 'shipping_street_address' : null,
            ]);

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });

        Schema::table('user_addresses', function (Blueprint $table) {
            if (Schema::hasColumn('user_addresses', 'street_address')) {
                $table->dropColumn('street_address');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $columns = array_filter([
                Schema::hasColumn('users', 'region') ? 'region' : null,
                Schema::hasColumn('users', 'barangay') ? 'barangay' : null,
            ]);

            if (!empty($columns)) {
                $table->dropColumn($columns);
            }
        });
    }
};
