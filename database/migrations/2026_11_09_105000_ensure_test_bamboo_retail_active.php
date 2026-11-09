<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Product::withTrashed()->where('sku', 'TEST-BAMBOO-01')->update([
            'slug' => 'test-bamboo-01-synthetic-cup',
            'status' => 'Active',
            'is_b2b_supply' => false,
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
