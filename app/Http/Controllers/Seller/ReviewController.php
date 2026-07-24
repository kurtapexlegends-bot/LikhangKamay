<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Review;
use App\Models\ReviewDispute;
use App\Services\StorageUrl;
use App\Support\RichTextSanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;

class ReviewController extends Controller
{
    use InteractsWithSellerContext;

    public function index()
    {
        $sellerId = $this->sellerOwnerId();

        $reviews = Review::whereHas('product', function ($query) use ($sellerId) {
            $query->where('user_id', $sellerId);
        })
            ->with(['user', 'product', 'disputes.reporter'])
            ->latest()
            ->get()
            ->map(function ($review) {
                $latestDispute = $review->disputes->first();

                return [
                    'id' => $review->id,
                    'rating' => $review->rating,
                    'comment' => $review->comment,
                    'photos' => $review->photos ?? [],
                    'date' => $review->created_at->format('M d, Y'),
                    'customer' => $review->user->name ?? 'Unknown',
                    'product_name' => $review->product->name ?? 'Unknown Product',
                    'product_id' => $review->product_id,
                    'product_image' => StorageUrl::url($review->product?->cover_photo_path),
                    'seller_reply' => RichTextSanitizer::sanitize($review->seller_reply),
                    'is_pinned' => $review->is_pinned,
                    'is_hidden_from_marketplace' => (bool) $review->is_hidden_from_marketplace,
                    'dispute' => $latestDispute ? [
                        'id' => $latestDispute->id,
                        'status' => $latestDispute->status,
                        'reason' => $latestDispute->reason,
                        'details' => $latestDispute->details,
                        'reported_at' => $latestDispute->created_at?->toIso8601String(),
                        'reported_by' => $latestDispute->reporter?->name,
                        'review_hidden_from_marketplace' => (bool) $review->is_hidden_from_marketplace,
                    ] : null,
                ];
            });

        $stats = [
            'total' => $reviews->count(),
            'average' => $reviews->count() > 0 ? round($reviews->avg('rating'), 1) : 0,
            'stars' => [
                '5' => $reviews->where('rating', 5)->count(),
                '4' => $reviews->where('rating', 4)->count(),
                '3' => $reviews->where('rating', 3)->count(),
                '2' => $reviews->where('rating', 2)->count(),
                '1' => $reviews->where('rating', 1)->count(),
            ],
        ];

        return Inertia::render('Seller/Chat/Reviews', [
            'reviews' => $reviews,
            'stats' => $stats,
        ]);
    }

    public function reply(Request $request, int $id)
    {
        $request->validate([
            'seller_reply' => 'required|string|max:2000',
        ]);

        $review = Review::with('product')->findOrFail($id);
        $this->authorizeSellerOwnership($review->product->user_id);

        $review->update([
            'seller_reply' => RichTextSanitizer::sanitize($request->seller_reply),
        ]);

        return back()->with('success', 'Reply posted successfully!');
    }

    public function destroyReply(int $id)
    {
        $review = Review::with('product')->findOrFail($id);
        $this->authorizeSellerOwnership($review->product->user_id);

        $review->update([
            'seller_reply' => null,
        ]);

        return back()->with('success', 'Reply deleted successfully!');
    }

    public function dispute(Request $request, int $id)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:120',
            'details' => 'nullable|string|max:1500',
        ]);

        $review = Review::with('product')->findOrFail($id);
        $this->authorizeSellerOwnership($review->product->user_id);

        $existingOpenDispute = ReviewDispute::query()
            ->where('review_id', $review->id)
            ->whereIn('status', ['pending', 'under_review'])
            ->first();

        if ($existingOpenDispute) {
            return back()->with('error', 'This review already has an open moderation request.');
        }

        ReviewDispute::create($this->buildReviewDisputePayload([
            'review_id' => $review->id,
            'seller_owner_id' => $review->product->user_id,
            'reported_by_user_id' => $request->user()?->id,
            'status' => 'pending',
            'reason' => $validated['reason'],
            'details' => $validated['details'] ?? null,
        ]));

        return back()->with('success', 'Moderation request sent to the admin review queue.');
    }

    public function updateDispute(Request $request, ReviewDispute $reviewDispute)
    {
        $validated = $request->validate([
            'reason' => 'required|string|max:120',
            'details' => 'nullable|string|max:1500',
        ]);

        $reviewDispute->loadMissing('review.product');

        abort_if(!$reviewDispute->review || !$reviewDispute->review->product, 404);
        $this->authorizeSellerOwnership($reviewDispute->review->product->user_id);

        if (!in_array($reviewDispute->status, ['pending', 'under_review'], true)) {
            return back()->with('error', 'Only open moderation requests can be edited.');
        }

        $reviewDispute->update($this->buildReviewDisputePayload([
            'reason' => $validated['reason'],
            'details' => $validated['details'] ?? null,
        ]));

        return back()->with('success', 'Moderation request updated.');
    }

    public function destroyDispute(Request $request, ReviewDispute $reviewDispute)
    {
        $reviewDispute->loadMissing('review.product');

        abort_if(!$reviewDispute->review || !$reviewDispute->review->product, 404);
        $this->authorizeSellerOwnership($reviewDispute->review->product->user_id);

        if (!in_array($reviewDispute->status, ['pending', 'under_review'], true)) {
            return back()->with('error', 'Only open moderation requests can be removed.');
        }

        $reviewDispute->delete();

        return back()->with('success', 'Moderation request removed.');
    }

    private function buildReviewDisputePayload(array $payload): array
    {
        if ($this->reviewDisputesHasColumn('seller_id')) {
            $payload['seller_id'] = $payload['seller_owner_id'] ?? null;
        }

        if ($this->reviewDisputesHasColumn('explanation')) {
            $payload['explanation'] = $payload['details'] ?? null;
        }

        return $payload;
    }

    private function reviewDisputesHasColumn(string $column): bool
    {
        static $cache = [];

        return $cache[$column] ??= Schema::hasColumn('review_disputes', $column);
    }

    public function togglePin(int $id)
    {
        $review = Review::with('product')->findOrFail($id);
        $this->authorizeSellerOwnership($review->product->user_id);

        if ($review->is_hidden_from_marketplace) {
            return back()->with('error', 'Hidden reviews cannot be pinned.');
        }

        if ($review->is_pinned) {
            $review->update(['is_pinned' => false]);

            return back()->with('success', 'Review unpinned.');
        }

        Review::where('product_id', $review->product_id)
            ->where('is_pinned', true)
            ->update(['is_pinned' => false]);

        $review->update(['is_pinned' => true]);

        return back()->with('success', 'Review pinned to top!');
    }
}
