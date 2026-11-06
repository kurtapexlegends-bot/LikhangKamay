<?php

declare(strict_types=1);

namespace App\Actions\Review;

use App\Models\Review;
use App\Services\StorageUrl;
use Illuminate\Support\Collection;

class FetchBuyerReviewsAction
{
    /**
     * Fetch and present the buyer's reviews with moderation and reply metadata.
     *
     * @param int $userId
     * @return Collection<int, array<string, mixed>>
     */
    public function execute(int $userId): Collection
    {
        return Review::where('user_id', $userId)
            ->with(['product.user', 'disputes'])
            ->latest()
            ->get()
            ->map(function ($review) {
                $latestDispute = $review->disputes->first();
                $isHidden = (bool) $review->is_hidden_from_marketplace;
                $hasActiveDispute = $latestDispute && in_array($latestDispute->status, ['pending', 'under_review'], true);

                $statusLabel = 'Public Review';
                $statusTone = 'success';
                $notice = null;

                if ($isHidden) {
                    $statusLabel = 'Hidden from Storefront';
                    $statusTone = 'danger';
                    $notice = $latestDispute?->resolution_notes ?: 'This review was reviewed by platform moderation and is hidden from public storefronts.';
                } elseif ($hasActiveDispute) {
                    $statusLabel = 'Under Moderation Review';
                    $statusTone = 'warning';
                    $notice = 'The artisan requested safety moderation on this review. It remains visible while under admin review.';
                } elseif ($latestDispute && $latestDispute->status === 'rejected') {
                    $statusLabel = 'Passed Safety Review';
                    $statusTone = 'success';
                    $notice = $latestDispute->resolution_notes
                        ? "Platform moderation reviewed this report and confirmed your review complies with platform guidelines. Admin note: {$latestDispute->resolution_notes}"
                        : 'Platform moderation reviewed this report and confirmed your review complies with platform guidelines.';
                }

                return [
                    'id' => $review->id,
                    'rating' => (int) $review->rating,
                    'comment' => $review->comment,
                    'photos' => $review->photo_urls ?? [],
                    'date' => $review->created_at?->format('M d, Y') ?? 'Recent',
                    'date_human' => $review->created_at?->diffForHumans() ?? '',
                    'seller_reply' => $review->seller_reply,
                    'seller_reply_date' => $review->seller_reply ? ($review->updated_at?->format('M d, Y') ?? 'Recent') : null,
                    'seller_reply_human' => $review->seller_reply ? ($review->updated_at?->diffForHumans() ?? '') : null,
                    'seller_reply_raw' => $review->seller_reply ? $review->updated_at?->toIso8601String() : null,
                    'is_pinned' => (bool) $review->is_pinned,
                    'is_hidden_from_marketplace' => $isHidden,
                    'moderation' => [
                        'is_hidden' => $isHidden,
                        'has_dispute' => (bool) $latestDispute,
                        'dispute_status' => $latestDispute?->status,
                        'dispute_reason' => $latestDispute?->reason,
                        'resolution_notes' => $latestDispute?->resolution_notes,
                        'status_label' => $statusLabel,
                        'status_tone' => $statusTone,
                        'notice' => $notice,
                    ],
                    'product' => [
                        'id' => $review->product?->id,
                        'name' => $review->product?->name ?? 'Handcrafted Item',
                        'slug' => $review->product?->slug,
                        'image' => StorageUrl::url($review->product?->cover_photo_path),
                        'workshop_name' => $review->product?->user?->shop_name ?: ($review->product?->user?->name ?: 'Artisan Workshop'),
                        'workshop_slug' => $review->product?->user?->shop_slug,
                    ],
                ];
            });
    }
}
