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
        Schema::create('supplies', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // The Seller
            $table->string('name'); // e.g., "Terracotta Clay", "Glaze"
            $table->string('category'); // e.g., "Raw Materials", "Tools", "Packaging"
            $table->integer('quantity')->default(0); // Current stock
            $table->string('unit')->default('pcs'); // pcs, kg, liters, bags
            $table->integer('min_stock')->default(10); // Low stock threshold
            $table->decimal('unit_cost', 10, 2)->nullable(); // Cost per unit
            $table->string('supplier')->nullable(); // Supplier name
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('supplies');
    }
};
