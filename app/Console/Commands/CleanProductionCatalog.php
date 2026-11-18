<?php

namespace App\Console\Commands;

use App\Models\Product;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class CleanProductionCatalog extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'catalog:clean-test-data {--force : Bypass confirmation}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Soft-delete and archive synthetic, test, and flawed mock products from public catalog.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $this->info('Starting catalog test data purge...');

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

        $archivedCount = 0;

        Product::withTrashed()->whereIn('sku', $skusToArchive)->get()->each(function (Product $product) use (&$archivedCount) {
            $product->update([
                'status' => 'Archived',
                'is_sponsored' => false,
                'sponsored_until' => null,
            ]);
            $product->delete();
            $archivedCount++;
        });

        $testNamePatterns = [
            '%Synthetic%',
            '%ETIVAC%',
            '%Flowery Vase%',
            '%Handcrafted Glazed Ceramic Vase%',
        ];

        foreach ($testNamePatterns as $pattern) {
            Product::withTrashed()->where('name', 'like', $pattern)->get()->each(function (Product $product) use (&$archivedCount) {
                $product->update([
                    'status' => 'Archived',
                    'is_sponsored' => false,
                    'sponsored_until' => null,
                ]);
                $product->delete();
                $archivedCount++;
            });
        }

        $userCount = 0;
        $testShopPatterns = [
            '%Cavite Test Craft%',
            '%ArtisansaEtivac%',
            '%Pots%',
        ];

        foreach ($testShopPatterns as $pattern) {
            User::withTrashed()->where('role', 'artisan')->where('shop_name', 'like', $pattern)->get()->each(function (User $user) use (&$userCount) {
                $user->update(['artisan_status' => 'rejected']);
                $user->delete();
                $userCount++;
            });
        }

        User::withTrashed()->whereIn('email', [
            'test.artisan@likhangkamay.local',
            'test.buyer@likhangkamay.local',
            'test.driver@likhangkamay.local',
        ])->get()->each(function (User $user) use (&$userCount) {
            $user->delete();
            $userCount++;
        });

        // Flush all catalog caches
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

        $this->info("Catalog cleaned successfully:");
        $this->info("- {$archivedCount} test / flawed products archived and removed.");
        $this->info("- {$userCount} test accounts archived.");
        $this->info("- All catalog and homepage merchandising caches evicted.");

        return 0;
    }
}
