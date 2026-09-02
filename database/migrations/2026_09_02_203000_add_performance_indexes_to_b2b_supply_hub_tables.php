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
            if (Schema::hasColumn('products', 'is_b2b_supply')) {
                $table->index(['is_b2b_supply', 'status', 'stock'], 'idx_products_b2b_active_stock');
                $table->index(['user_id', 'is_b2b_supply'], 'idx_products_user_b2b');
            }
        });

        Schema::table('order_items', function (Blueprint $table) {
            if (Schema::hasColumn('order_items', 'is_b2b_supply')) {
                $table->index(['order_id', 'is_b2b_supply'], 'idx_order_items_order_b2b');
                $table->index('is_b2b_supply', 'idx_order_items_is_b2b_supply');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (Schema::hasColumn('orders', 'artisan_id')) {
                $table->index(['artisan_id', 'status'], 'idx_orders_artisan_status');
            }
            if (Schema::hasColumn('orders', 'user_id')) {
                $table->index(['user_id', 'status'], 'idx_orders_user_status');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_b2b_active_stock');
            $table->dropIndex('idx_products_user_b2b');
        });

        Schema::table('order_items', function (Blueprint $table) {
            $table->dropIndex('idx_order_items_order_b2b');
            $table->dropIndex('idx_order_items_is_b2b_supply');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_artisan_status');
            $table->dropIndex('idx_orders_user_status');
        });
    }
};
