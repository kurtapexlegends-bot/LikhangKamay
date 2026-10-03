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
        $driver = DB::getDriverName();

        if ($driver === 'pgsql') {
            DB::statement("
                DO \$\$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns 
                        WHERE table_schema = 'public' 
                          AND table_name = 'products' 
                          AND column_name = 'gallery_paths'
                    ) THEN
                        -- Safely normalize any non-array or malformed JSON rows to empty array []
                        UPDATE products 
                        SET gallery_paths = '[]'::json 
                        WHERE gallery_paths IS NOT NULL 
                          AND (
                              gallery_paths::text = '' 
                              OR gallery_paths::text = '{}' 
                              OR jsonb_typeof((gallery_paths)::jsonb) != 'array'
                          );
                    END IF;
                END \$\$;
            ");
        } elseif ($driver === 'mysql') {
            if (Schema::hasTable('products') && Schema::hasColumn('products', 'gallery_paths')) {
                DB::statement("
                    UPDATE products 
                    SET gallery_paths = '[]' 
                    WHERE gallery_paths IS NOT NULL 
                      AND (
                          gallery_paths = '' 
                          OR gallery_paths = '{}' 
                          OR NOT JSON_VALID(gallery_paths) 
                          OR JSON_TYPE(gallery_paths) != 'ARRAY'
                      );
                ");
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No destructive reverse operation needed as normalizing malformed rows preserves integrity.
    }
};
