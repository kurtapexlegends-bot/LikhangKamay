<?php

namespace App\Observers;

use App\Models\Product;
use Illuminate\Support\Facades\Cache;

class ProductObserver
{
    /**
     * Handle the Product "saved" event.
     */
    public function saved(Product $product): void
    {
        $this->clearProductCache($product);
    }

    /**
     * Handle the Product "deleted" event.
     */
    public function deleted(Product $product): void
    {
        $this->clearProductCache($product);
    }

    /**
     * Handle the Product "restored" event.
     */
    public function restored(Product $product): void
    {
        $this->clearProductCache($product);
    }

    /**
     * Handle the Product "forceDeleted" event.
     */
    public function forceDeleted(Product $product): void
    {
        $this->clearProductCache($product);
    }

    /**
     * Invalidate cached products and best seller lists for the product's seller.
     */
    protected function clearProductCache(Product $product): void
    {
        if ($product->user_id) {
            Cache::forget("seller_{$product->user_id}_products");
            Cache::forget("seller_{$product->user_id}_best_sellers");
        }
    }
}
