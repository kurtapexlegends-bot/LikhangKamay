<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add production_method to products
        Schema::table('products', function (Blueprint $blueprint) {
            $blueprint->string('production_method')->default('resell')->after('status'); // resell or manufactured
        });

        // Update product_recipes table (pivot for BOM)
        Schema::dropIfExists('product_recipes');
        Schema::create('product_recipes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->onDelete('cascade');
            $table->foreignId('supply_id')->constrained()->onDelete('cascade');
            $table->decimal('quantity_required', 10, 2); // e.g. 0.5 kg
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $blueprint) {
            $blueprint->dropColumn('production_method');
        });
        Schema::dropIfExists('product_recipes');
    }
};
