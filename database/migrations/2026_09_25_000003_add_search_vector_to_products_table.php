<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            if (Schema::hasTable('products')) {
                // Add generated tsvector column for fast full-text search indexing
                DB::statement("
                    ALTER TABLE products 
                    ADD COLUMN IF NOT EXISTS search_vector tsvector 
                    GENERATED ALWAYS AS (to_tsvector('english', 
                        COALESCE(name, '') || ' ' || 
                        COALESCE(description, '') || ' ' || 
                        COALESCE(category, '')
                    )) STORED;
                ");

                // Create GIN index on stored search_vector
                DB::statement("
                    CREATE INDEX IF NOT EXISTS products_search_vector_gin_index 
                    ON products USING GIN (search_vector);
                ");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            if (Schema::hasTable('products')) {
                DB::statement("DROP INDEX IF EXISTS products_search_vector_gin_index;");
                DB::statement("ALTER TABLE products DROP COLUMN IF EXISTS search_vector;");
            }
        }
    }
};
