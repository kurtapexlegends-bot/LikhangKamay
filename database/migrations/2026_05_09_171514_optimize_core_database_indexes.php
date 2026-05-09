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
            $table->index('deleted_at');
            $table->index('sku');
            $table->index('status');
            $table->index('category');
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->index('deleted_at');
            $table->index('status');
            $table->index('order_number');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->index('deleted_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->index('artisan_status');
            $table->index('role');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
            $table->dropIndex(['sku']);
            $table->dropIndex(['status']);
            $table->dropIndex(['category']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
            $table->dropIndex(['status']);
            $table->dropIndex(['order_number']);
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropIndex(['deleted_at']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['artisan_status']);
            $table->dropIndex(['role']);
        });
    }
};
