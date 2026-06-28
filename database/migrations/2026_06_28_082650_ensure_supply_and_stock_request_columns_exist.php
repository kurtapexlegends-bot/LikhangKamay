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
        if (!Schema::hasColumn('supplies', 'product_id')) {
            Schema::table('supplies', function (Blueprint $table) {
                $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            });
        }

        if (!Schema::hasColumn('supplies', 'max_stock')) {
            Schema::table('supplies', function (Blueprint $table) {
                $table->integer('max_stock')->nullable();
            });
        }

        if (!Schema::hasColumn('stock_requests', 'requested_by_user_id')) {
            Schema::table('stock_requests', function (Blueprint $table) {
                $table->foreignId('requested_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('supplies', function (Blueprint $table) {
            if (Schema::hasColumn('supplies', 'product_id')) {
                $table->dropForeign(['product_id']);
                $table->dropColumn('product_id');
            }
            if (Schema::hasColumn('supplies', 'max_stock')) {
                $table->dropColumn('max_stock');
            }
        });

        Schema::table('stock_requests', function (Blueprint $table) {
            if (Schema::hasColumn('stock_requests', 'requested_by_user_id')) {
                $table->dropForeign(['requested_by_user_id']);
                $table->dropColumn('requested_by_user_id');
            }
        });
    }
};
