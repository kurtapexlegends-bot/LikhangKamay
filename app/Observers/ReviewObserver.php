<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\Review;

class ReviewObserver
{
    /**
     * Handle the Review "created" event.
     */
    public function created(Review $review): void
    {
        $this->recalculateProductAggregates($review->product_id);
    }

    /**
     * Handle the Review "updated" event.
     */
    public function updated(Review $review): void
    {
        if ($review->wasChanged(['rating', 'is_hidden_from_marketplace', 'product_id'])) {
            $this->recalculateProductAggregates($review->product_id);
            if ($review->wasChanged('product_id')) {
                $this->recalculateProductAggregates($review->getOriginal('product_id'));
            }
        }
    }

    /**
     * Handle the Review "deleted" event.
     */
    public function deleted(Review $review): void
    {
        $this->recalculateProductAggregates($review->product_id);
    }

    /**
     * Handle the Review "restored" event.
     */
    public function restored(Review $review): void
    {
        $this->recalculateProductAggregates($review->product_id);
    }

    /**
     * Handle the Review "force deleted" event.
     */
    public function forceDeleted(Review $review): void
    {
        $this->recalculateProductAggregates($review->product_id);
    }

    private function recalculateProductAggregates(int|string|null $productId): void
    {
        if (!$productId) return;

        $product = Product::find($productId);
        if (!$product) return;

        $stats = Review::where('product_id', $productId)
            ->where('is_hidden_from_marketplace', false)
            ->selectRaw('COUNT(*) as count, ROUND(AVG(rating), 2) as avg')
            ->first();

        $product->update([
            'rating' => $stats->avg ?? 0,
            'reviews_count' => $stats->count ?? 0,
        ]);
    }
}
