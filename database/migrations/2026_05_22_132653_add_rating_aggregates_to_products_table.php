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
            $table->decimal('rating', 3, 2)->default(0)->after('sold')->index();
            $table->unsignedInteger('reviews_count')->default(0)->after('rating')->index();
        });

        // Backfill existing ratings and counts from the reviews table
        \Illuminate\Support\Facades\DB::statement("
            UPDATE products
            SET 
                rating = COALESCE((SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.product_id = products.id AND r.is_hidden_from_marketplace = false), 0),
                reviews_count = COALESCE((SELECT COUNT(*) FROM reviews r WHERE r.product_id = products.id AND r.is_hidden_from_marketplace = false), 0)
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['rating', 'reviews_count']);
        });
    }
};
