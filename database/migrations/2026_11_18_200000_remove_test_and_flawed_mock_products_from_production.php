<?php

use App\Models\Product;
use App\Models\User;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $connectionName = $this->getConnection() ?: DB::getDefaultConnection();
        $isPretending = rescue(fn () => DB::connection($connectionName)->pretending(), false);

        if (app()->environment('testing') || $isPretending || $connectionName === 'verify_pgsql') {
            return;
        }

        // 1. Soft-delete and archive synthetic, test, and flawed mock products
        $skusToArchive = [
            'TEST-BAMBOO-01',
            'B2B-CLAY-62',
            'KAPWA-MUG-004',
            'KAPWA-PLANTER-005',
            'KAPWA-BOWL-006',
            'SILANG-POT-007',
            'SILANG-JAR-008',
            'SILANG-PLATE-009',
            'SILANG-VASE-010',
            'AMADEO-MUG-011',
            'AMADEO-SET-012',
            'AMADEO-DECOR-013',
        ];

        Product::withTrashed()->whereIn('sku', $skusToArchive)->get()->each(function (Product $product) {
            $product->update([
                'status' => 'Archived',
                'is_sponsored' => false,
                'sponsored_until' => null,
            ]);
            $product->delete();
        });

        // 2. Soft-delete products with informal test names or synthetic patterns
        $testNamePatterns = [
            '%Synthetic%',
            '%ETIVAC%',
            '%Flowery Vase%',
            '%Handcrafted Glazed Ceramic Vase%',
        ];

        foreach ($testNamePatterns as $pattern) {
            Product::withTrashed()->where('name', 'like', $pattern)->get()->each(function (Product $product) {
                $product->update([
                    'status' => 'Archived',
                    'is_sponsored' => false,
                    'sponsored_until' => null,
                ]);
                $product->delete();
            });
        }

        // 3. Soft-delete dummy test artisan users
        $testShopPatterns = [
            '%Cavite Test Craft%',
            '%ArtisansaEtivac%',
            '%Pots%',
        ];

        foreach ($testShopPatterns as $pattern) {
            User::withTrashed()->where('role', 'artisan')->where('shop_name', 'like', $pattern)->get()->each(function (User $user) {
                $user->update(['artisan_status' => 'rejected']);
                $user->delete();
            });
        }

        User::withTrashed()->whereIn('email', [
            'test.artisan@likhangkamay.local',
            'test.buyer@likhangkamay.local',
            'test.driver@likhangkamay.local',
        ])->get()->each(function (User $user) {
            $user->delete();
        });

        // 4. Invalidate all catalog and merchandising caches
        Cache::forget('shop_catalog_default_page_1');
        Cache::forget('shop_catalog_default_page_1_12');
        Cache::forget('shop_catalog_default_page_1_24');
        Cache::forget('home_sponsored_products');
        Cache::forget('home_featured_products_pool');
        Cache::forget('home_top_sellers');
        Cache::forget('home_categories');
        Cache::forget('catalog_materials');
        Cache::forget('catalog_locations');
        Cache::forget('catalog_categories');
        Cache::forget('catalog_category_counts');
        Cache::forget('catalog_material_counts');
        Cache::forget('catalog_location_counts');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Additive & non-destructive archive
    }
};
