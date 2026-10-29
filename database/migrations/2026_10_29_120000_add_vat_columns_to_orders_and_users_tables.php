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
            if (!Schema::hasColumn('orders', 'vat_type')) {
                $table->string('vat_type')->default('vat_exempt')->after('total_amount');
            }
            if (!Schema::hasColumn('orders', 'vatable_sales')) {
                $table->decimal('vatable_sales', 10, 2)->default(0.00)->after('vat_type');
            }
            if (!Schema::hasColumn('orders', 'vat_amount')) {
                $table->decimal('vat_amount', 10, 2)->default(0.00)->after('vatable_sales');
            }
            if (!Schema::hasColumn('orders', 'vat_exempt_sales')) {
                $table->decimal('vat_exempt_sales', 10, 2)->default(0.00)->after('vat_amount');
            }
            if (!Schema::hasColumn('orders', 'vat_rate')) {
                $table->decimal('vat_rate', 5, 2)->default(12.00)->after('vat_exempt_sales');
            }
        });

        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'tin')) {
                $table->string('tin', 30)->nullable()->after('tin_id');
            }
            if (!Schema::hasColumn('users', 'is_vat_registered')) {
                $table->boolean('is_vat_registered')->default(false)->after('tin');
            }
            if (!Schema::hasColumn('users', 'tax_business_name')) {
                $table->string('tax_business_name', 255)->nullable()->after('is_vat_registered');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $orderColumns = array_filter([
                Schema::hasColumn('orders', 'vat_rate') ? 'vat_rate' : null,
                Schema::hasColumn('orders', 'vat_exempt_sales') ? 'vat_exempt_sales' : null,
                Schema::hasColumn('orders', 'vat_amount') ? 'vat_amount' : null,
                Schema::hasColumn('orders', 'vatable_sales') ? 'vatable_sales' : null,
                Schema::hasColumn('orders', 'vat_type') ? 'vat_type' : null,
            ]);

            if (!empty($orderColumns)) {
                $table->dropColumn($orderColumns);
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $userColumns = array_filter([
                Schema::hasColumn('users', 'tax_business_name') ? 'tax_business_name' : null,
                Schema::hasColumn('users', 'is_vat_registered') ? 'is_vat_registered' : null,
                Schema::hasColumn('users', 'tin') ? 'tin' : null,
            ]);

            if (!empty($userColumns)) {
                $table->dropColumn($userColumns);
            }
        });
    }
};
