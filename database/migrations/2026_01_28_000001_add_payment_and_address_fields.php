<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add payment_status to orders table
        Schema::table('orders', function (Blueprint $table) {
            $table->string('payment_status')->default('pending')->after('payment_method');
            // pending = awaiting payment
            // paid = payment confirmed
            // refunded = payment refunded
        });

        // Add saved_address to users table for buyers
        Schema::table('users', function (Blueprint $table) {
            $table->text('saved_address')->nullable()->after('tin_id');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('payment_status');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('saved_address');
        });
    }
};
