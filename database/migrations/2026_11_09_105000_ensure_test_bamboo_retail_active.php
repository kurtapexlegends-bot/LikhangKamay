<?php

use App\Models\Product;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("
                UPDATE products 
                SET slug = 'test-bamboo-01-synthetic-cup', 
                    status = 'Active', 
                    is_b2b_supply = false, 
                    deleted_at = NULL 
                WHERE sku = 'TEST-BAMBOO-01'
            ");
        } else {
            DB::statement("
                UPDATE products 
                SET slug = 'test-bamboo-01-synthetic-cup', 
                    status = 'Active', 
                    is_b2b_supply = 0, 
                    deleted_at = NULL 
                WHERE sku = 'TEST-BAMBOO-01'
            ");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Additive; non-destructive
    }
};
