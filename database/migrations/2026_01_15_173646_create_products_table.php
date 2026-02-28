<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade'); // Link to Artisan
            
            // General Info
            $table->string('sku')->unique();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('category');
            $table->string('status')->default('Draft'); // Active, Draft, Archived

            // Specs
            $table->string('clay_type')->nullable();
            $table->string('glaze_type')->nullable();
            $table->string('firing_method')->nullable();
            $table->boolean('food_safe')->default(true);
            $table->json('colors')->nullable(); // Stores array of colors ["Red", "Blue"]

            // Dimensions (Stored separately for filtering later)
            $table->decimal('height', 8, 2)->nullable();
            $table->decimal('width', 8, 2)->nullable();
            $table->integer('weight')->nullable(); // in grams

            // Inventory
            $table->decimal('price', 10, 2);
            $table->integer('stock')->default(0);
            $table->integer('lead_time')->default(3); // Days
            $table->integer('sold')->default(0);

            // Media Paths
            $table->string('cover_photo_path')->nullable();
            $table->json('gallery_paths')->nullable(); // Stores array of paths
            $table->string('model_3d_path')->nullable(); // Path to .glb file

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};