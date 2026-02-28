<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add tracking fields to orders table for improved order flow.
     * - shipping_notes: For Lalamove/courier discussion notes
     * - tracking_number: Courier tracking reference
     * - received_at: When buyer confirms receipt
     * - warranty_expires_at: received_at + 1 day (return window)
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->text('shipping_notes')->nullable()->after('shipping_address');
            $table->string('tracking_number')->nullable()->after('shipping_notes');
            $table->timestamp('received_at')->nullable()->after('tracking_number');
            $table->timestamp('warranty_expires_at')->nullable()->after('received_at');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['shipping_notes', 'tracking_number', 'received_at', 'warranty_expires_at']);
        });
    }
};
