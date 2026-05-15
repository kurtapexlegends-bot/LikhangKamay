<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            // PostgreSQL Full-Text Search (GIN Index)
            DB::statement("
                CREATE INDEX products_search_gin_index ON products 
                USING GIN (to_tsvector('english', 
                    COALESCE(name, '') || ' ' || 
                    COALESCE(description, '') || ' ' || 
                    COALESCE(category, '')
                ))
            ");
        } elseif ($driver === 'mysql') {
            // MySQL Full-Text Search Fallback
            Schema::table('products', function (Blueprint $table) {
                $table->fullText(['name', 'description', 'category'], 'products_search_fulltext');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("DROP INDEX IF EXISTS products_search_gin_index");
        } elseif ($driver === 'mysql') {
            Schema::table('products', function (Blueprint $table) {
                $table->dropFullText('products_search_fulltext');
            });
        }
    }
};
