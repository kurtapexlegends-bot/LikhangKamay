<?php

use App\Models\Product;
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

        // Remap known orphaned/missing storage product cover paths to valid static demo assets
        Product::withTrashed()
            ->where(function ($q) {
                $q->where('cover_photo_path', 'like', '%synthetic_bamboo%')
                  ->orWhere('cover_photo_path', 'like', '%bTidkz3NCqLS0e1m3bAP8wjljgo6RiwCOIfCU8sV%');
            })
            ->update([
                'cover_photo_path' => '/images/demo/products/espresso-cup-cover.jpg',
            ]);

        // Invalidate catalog caches so the updated cover paths take effect immediately
        Cache::forget('shop_catalog_default_page_1');
        Cache::forget('shop_catalog_default_page_1_12');
        Cache::forget('shop_catalog_default_page_1_24');
        Cache::forget('home_sponsored_products');
        Cache::forget('home_featured_products_pool');
        Cache::forget('home_top_sellers');
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Additive safe migration; no data destruction on down()
    }
};
