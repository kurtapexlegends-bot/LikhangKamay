<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Product::withTrashed()->whereNull('slug')->orWhere('slug', '')->get()->each(function (Product $product) {
            $product->slug = Str::slug($product->name . '-' . $product->id);
            $product->saveQuietly();
        });

        // Ensure TEST-BAMBOO-01 has exact slug, status, and cover images
        Product::withTrashed()->where('sku', 'TEST-BAMBOO-01')->update([
            'slug' => 'test-bamboo-01-synthetic-cup',
            'cover_photo_path' => 'products/cover/synthetic_bamboo.jpg',
            'status' => 'Active',
            'deleted_at' => null,
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Additive; non-destructive
    }
};
