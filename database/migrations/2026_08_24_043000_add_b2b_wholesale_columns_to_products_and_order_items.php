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
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'is_b2b_supply')) {
                $table->boolean('is_b2b_supply')->default(false)->index();
            }
            if (!Schema::hasColumn('products', 'moq')) {
                $table->unsignedInteger('moq')->default(1);
            }
            if (!Schema::hasColumn('products', 'wholesale_price')) {
                $table->decimal('wholesale_price', 10, 2)->nullable();
            }
            if (!Schema::hasColumn('products', 'wholesale_min_qty')) {
                $table->unsignedInteger('wholesale_min_qty')->nullable();
            }
            if (!Schema::hasColumn('products', 'supply_unit')) {
                $table->string('supply_unit', 50)->nullable()->default('pcs');
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            if (!Schema::hasColumn('order_items', 'is_b2b_supply')) {
                $table->boolean('is_b2b_supply')->default(false);
            }
            if (!Schema::hasColumn('order_items', 'supply_unit')) {
                $table->string('supply_unit', 50)->nullable()->default('pcs');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['is_b2b_supply', 'moq', 'wholesale_price', 'wholesale_min_qty', 'supply_unit']);
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropColumn(['is_b2b_supply', 'supply_unit']);
        });
    }
};
