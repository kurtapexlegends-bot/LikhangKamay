<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. ORDERS TABLE
        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            // Link to the Seller (Artisan) receiving the order
            $table->foreignId('artisan_id')->constrained('users')->onDelete('cascade');
            // Link to the Buyer (User) placing the order
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            $table->string('order_number')->unique(); // e.g. ORD-2026-001
            $table->string('customer_name'); // Snapshot of name for easy display
            $table->decimal('total_amount', 10, 2);
            $table->string('status')->default('Pending'); // Pending, Accepted, Shipped, Completed, Cancelled, Rejected
            $table->string('payment_method')->default('COD');
            $table->text('shipping_address');
            
            $table->timestamps();
        });

        // 2. ORDER ITEMS TABLE
        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->onDelete('cascade');
            $table->foreignId('product_id')->nullable()->constrained()->onDelete('set null');
            
            // Store snapshots in case the product is later changed/deleted
            $table->string('product_name');
            $table->string('variant')->nullable(); // e.g. "Blue Ocean"
            $table->decimal('price', 10, 2);
            $table->integer('quantity');
            $table->string('product_img')->nullable(); 

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
    }
};