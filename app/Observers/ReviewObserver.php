<?php

namespace App\Observers;

use App\Models\Product;
use App\Models\Review;
use App\Models\SellerActivityLog;

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

        $review->loadMissing('product');

        // Audit seller replies
        if ($review->wasChanged('seller_reply') && $review->product) {
            $beforeReply = $review->getOriginal('seller_reply');
            $afterReply = $review->seller_reply;

            if ($afterReply !== null) {
                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $review->product->user_id,
                    'actor_user_id' => auth()->id(),
                    'actor_type' => SellerActivityLog::resolveActorType(auth()->user(), 'owner'),
                    'category' => 'operations',
                    'module' => 'reviews',
                    'event_type' => 'review_reply_updated',
                    'severity' => 'info',
                    'status' => 'updated',
                    'title' => 'Review Reply Saved',
                    'summary' => "A seller reply was saved for {$review->product->name}.",
                    'subject_type' => Review::class,
                    'subject_id' => $review->id,
                    'subject_label' => $review->product->name,
                    'reference' => 'Review #' . $review->id,
                    'details' => [
                        'before' => ['seller_reply' => $beforeReply],
                        'after' => ['seller_reply' => $afterReply],
                        'lines' => ['Updated seller response to a buyer review.'],
                    ],
                    'target_url' => route('reviews.index', ['highlight_review' => $review->id]),
                    'target_label' => 'Open Reviews',
                ]);
            } else {
                SellerActivityLog::recordEvent([
                    'seller_owner_id' => $review->product->user_id,
                    'actor_user_id' => auth()->id(),
                    'actor_type' => SellerActivityLog::resolveActorType(auth()->user(), 'owner'),
                    'category' => 'operations',
                    'module' => 'reviews',
                    'event_type' => 'review_reply_removed',
                    'severity' => 'warning',
                    'status' => 'deleted',
                    'title' => 'Review Reply Removed',
                    'summary' => "A seller reply was removed for {$review->product->name}.",
                    'subject_type' => Review::class,
                    'subject_id' => $review->id,
                    'subject_label' => $review->product->name,
                    'reference' => 'Review #' . $review->id,
                    'details' => [
                        'before' => ['seller_reply' => $beforeReply],
                        'after' => ['seller_reply' => null],
                        'lines' => ['Deleted seller response to a buyer review.'],
                    ],
                    'target_url' => route('reviews.index'),
                    'target_label' => 'Open Reviews',
                ]);
            }
        }

        // Audit pin status changes
        if ($review->wasChanged('is_pinned') && $review->product) {
            $isPinned = $review->is_pinned;
            SellerActivityLog::recordEvent([
                'seller_owner_id' => $review->product->user_id,
                'actor_user_id' => auth()->id(),
                'actor_type' => SellerActivityLog::resolveActorType(auth()->user(), 'owner'),
                'category' => 'operations',
                'module' => 'reviews',
                'event_type' => $isPinned ? 'review_pinned' : 'review_unpinned',
                'severity' => $isPinned ? 'success' : 'info',
                'status' => 'updated',
                'title' => $isPinned ? 'Review Pinned' : 'Pinned Review Removed',
                'summary' => $isPinned
                    ? "A review for {$review->product->name} was pinned to the top."
                    : "A pinned review was removed from {$review->product->name}.",
                'subject_type' => Review::class,
                'subject_id' => $review->id,
                'subject_label' => $review->product->name,
                'reference' => 'Review #' . $review->id,
                'target_url' => route('reviews.index', ['highlight_review' => $review->id]),
                'target_label' => 'Open Reviews',
            ]);
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

        $product->forceFill([
            'rating' => $stats->avg ?? 0,
            'reviews_count' => $stats->count ?? 0,
        ])->save();
    }
}
