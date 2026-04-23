<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Product;
use App\Models\Review;
use App\Models\ReviewDispute;
use App\Models\SellerActivityLog;
use App\Notifications\NewReviewNotification;
use App\Support\RichTextSanitizer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
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
                    'product_image' => $review->product->cover_photo_path
                        ? (str_starts_with($review->product->cover_photo_path, 'http') ? $review->product->cover_photo_path : '/storage/' . $review->product->cover_photo_path)
                        : null,
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

        return Inertia::render('Seller/Reviews', [
            'reviews' => $reviews,
            'stats' => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'product_id' => 'required|exists:products,id',
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'photos.*' => 'nullable|image|max:5120',
        ]);

        $orderQuery = \App\Models\Order::query()
            ->where('user_id', Auth::id())
            ->where('status', 'Completed');

        $hasPurchased = $orderQuery->whereHas('items', function ($query) use ($request) {
            $query->where('product_id', $request->product_id);
        })->exists();

        if (!$hasPurchased) {
            abort(403, 'You can only review products you have purchased and received.');
        }

        $existingReview = Review::where('user_id', Auth::id())
            ->where('product_id', $request->product_id)
            ->first();

        if ($existingReview) {
            return back()->with('error', 'You already reviewed this product. Update or delete your existing review instead.');
        }

        if ($request->hasFile('photos')) {
            $photoPaths = [];
            foreach ($request->file('photos') as $photo) {
                $photoPaths[] = $photo->store('reviews', 'public');
            }
        } else {
            $photoPaths = [];
        }

        $review = Review::create([
            'user_id' => Auth::id(),
            'product_id' => $request->product_id,
            'rating' => $request->rating,
            'comment' => $request->comment,
            'photos' => $photoPaths,
        ]);

        $product = Product::with('user')->find($request->product_id);
        if ($product && $product->user && $product->user->id !== Auth::id()) {
            $product->user->notify(new NewReviewNotification(
                $review,
                $product->name,
                Auth::user()->name
            ));
        }

        return back()->with('success', 'Review submitted successfully!');
    }

    public function update(Request $request, $id)
    {
        $review = Review::where('user_id', Auth::id())->findOrFail($id);

        $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
            'photos.*' => 'nullable|image|max:5120',
        ]);

        if ($request->hasFile('photos')) {
            $photoPaths = [];
            foreach ($request->file('photos') as $photo) {
                $photoPaths[] = $photo->store('reviews', 'public');
            }

            if ($review->photos) {
                foreach ($review->photos as $oldPhoto) {
                    Storage::disk('public')->delete($oldPhoto);
                }
            }
        } else {
            $photoPaths = $review->photos ?? [];
        }

        $review->update([
            'rating' => $request->rating,
            'comment' => $request->comment,
            'photos' => $photoPaths,
        ]);

        return back()->with('success', 'Review updated successfully!');
    }

    public function destroy($id)
    {
        $review = Review::where('user_id', Auth::id())->findOrFail($id);

        if ($review->photos) {
            foreach ($review->photos as $photo) {
                Storage::disk('public')->delete($photo);
            }
        }

        $review->delete();

        return back()->with('success', 'Review deleted successfully.');
    }

    public function reply(Request $request, $id)
    {
        $request->validate([
            'seller_reply' => 'required|string|max:2000',
        ]);

        $review = Review::with('product')->findOrFail($id);
        $this->authorizeSellerOwnership($review->product->user_id);
        $beforeReply = $review->seller_reply;

        $review->update([
            'seller_reply' => RichTextSanitizer::sanitize($request->seller_reply),
        ]);

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $review->product->user_id,
            'actor_user_id' => $request->user()?->id,
            'actor_type' => SellerActivityLog::resolveActorType($request->user(), 'owner'),
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
                'after' => ['seller_reply' => $review->seller_reply],
                'lines' => ['Updated seller response to a buyer review.'],
            ],
            'target_url' => route('reviews.index', ['highlight_review' => $review->id]),
            'target_label' => 'Open Reviews',
        ]);

        return back()->with('success', 'Reply posted successfully!');
    }

    public function destroyReply($id)
    {
        $review = Review::with('product')->findOrFail($id);
        $this->authorizeSellerOwnership($review->product->user_id);
        $beforeReply = $review->seller_reply;

        $review->update([
            'seller_reply' => null,
        ]);

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $review->product->user_id,
            'actor_user_id' => request()->user()?->id,
            'actor_type' => SellerActivityLog::resolveActorType(request()->user(), 'owner'),
            'category' => 'operations',
            'module' => 'reviews',
            'event_type' => 'review_reply_removed',
            'severity' => 'warning',
            'status' => 'removed',
            'title' => 'Review Reply Removed',
            'summary' => "The seller reply for {$review->product->name} was removed.",
            'subject_type' => Review::class,
            'subject_id' => $review->id,
            'subject_label' => $review->product->name,
            'reference' => 'Review #' . $review->id,
            'details' => [
                'before' => ['seller_reply' => $beforeReply],
                'after' => ['seller_reply' => null],
                'lines' => ['Removed seller response from the review thread.'],
            ],
            'target_url' => route('reviews.index', ['highlight_review' => $review->id]),
            'target_label' => 'Open Reviews',
        ]);

        return back()->with('success', 'Reply deleted successfully!');
    }

    public function dispute(Request $request, $id)
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

        $dispute = ReviewDispute::create($this->buildReviewDisputePayload([
            'review_id' => $review->id,
            'seller_owner_id' => $review->product->user_id,
            'reported_by_user_id' => $request->user()?->id,
            'status' => 'pending',
            'reason' => $validated['reason'],
            'details' => $validated['details'] ?? null,
        ]));

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $review->product->user_id,
            'actor_user_id' => $request->user()?->id,
            'actor_type' => SellerActivityLog::resolveActorType($request->user(), 'owner'),
            'category' => 'operations',
            'module' => 'reviews',
            'event_type' => 'review_dispute_requested',
            'severity' => 'warning',
            'status' => 'pending',
            'title' => 'Review Moderation Requested',
            'summary' => "A moderation request was submitted for {$review->product->name}.",
            'subject_type' => Review::class,
            'subject_id' => $review->id,
            'subject_label' => $review->product->name,
            'reference' => 'Review #' . $review->id,
            'details' => [
                'after' => [
                    'dispute_status' => $dispute->status,
                    'reason' => $dispute->reason,
                ],
                'lines' => array_values(array_filter([
                    'Reason: ' . $dispute->reason,
                    $dispute->details ? 'Details: ' . $dispute->details : null,
                ])),
            ],
            'target_url' => route('reviews.index', ['highlight_review' => $review->id]),
            'target_label' => 'Open Reviews',
        ]);

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

        $before = [
            'reason' => $reviewDispute->reason,
            'details' => $reviewDispute->details,
        ];

        $reviewDispute->update($this->buildReviewDisputePayload([
            'reason' => $validated['reason'],
            'details' => $validated['details'] ?? null,
        ]));

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $reviewDispute->review->product->user_id,
            'actor_user_id' => $request->user()?->id,
            'actor_type' => SellerActivityLog::resolveActorType($request->user(), 'owner'),
            'category' => 'operations',
            'module' => 'reviews',
            'event_type' => 'review_dispute_updated',
            'severity' => 'info',
            'status' => $reviewDispute->status,
            'title' => 'Review Moderation Request Updated',
            'summary' => "A moderation request was updated for {$reviewDispute->review->product->name}.",
            'subject_type' => Review::class,
            'subject_id' => $reviewDispute->review->id,
            'subject_label' => $reviewDispute->review->product->name,
            'reference' => 'Review #' . $reviewDispute->review->id,
            'details' => [
                'before' => $before,
                'after' => [
                    'reason' => $reviewDispute->reason,
                    'details' => $reviewDispute->details,
                ],
                'lines' => array_values(array_filter([
                    'Reason: ' . $reviewDispute->reason,
                    $reviewDispute->details ? 'Details: ' . $reviewDispute->details : null,
                ])),
            ],
            'target_url' => route('reviews.index', ['highlight_review' => $reviewDispute->review->id]),
            'target_label' => 'Open Reviews',
        ]);

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

        $productName = $reviewDispute->review->product->name;
        $reviewId = $reviewDispute->review->id;
        $sellerId = $reviewDispute->review->product->user_id;
        $reason = $reviewDispute->reason;
        $details = $reviewDispute->details;

        $reviewDispute->delete();

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $sellerId,
            'actor_user_id' => $request->user()?->id,
            'actor_type' => SellerActivityLog::resolveActorType($request->user(), 'owner'),
            'category' => 'operations',
            'module' => 'reviews',
            'event_type' => 'review_dispute_removed',
            'severity' => 'warning',
            'status' => 'removed',
            'title' => 'Review Moderation Request Removed',
            'summary' => "An open moderation request was removed for {$productName}.",
            'subject_type' => Review::class,
            'subject_id' => $reviewId,
            'subject_label' => $productName,
            'reference' => 'Review #' . $reviewId,
            'details' => [
                'before' => [
                    'reason' => $reason,
                    'details' => $details,
                ],
                'lines' => array_values(array_filter([
                    'Removed open moderation request.',
                    $reason ? 'Reason: ' . $reason : null,
                ])),
            ],
            'target_url' => route('reviews.index', ['highlight_review' => $reviewId]),
            'target_label' => 'Open Reviews',
        ]);

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

    public function togglePin($id)
    {
        $review = Review::with('product')->findOrFail($id);
        $this->authorizeSellerOwnership($review->product->user_id);

        if ($review->is_hidden_from_marketplace) {
            return back()->with('error', 'Hidden reviews cannot be pinned.');
        }

        if ($review->is_pinned) {
            $review->update(['is_pinned' => false]);

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $review->product->user_id,
                'actor_user_id' => request()->user()?->id,
                'actor_type' => SellerActivityLog::resolveActorType(request()->user(), 'owner'),
                'category' => 'operations',
                'module' => 'reviews',
                'event_type' => 'review_unpinned',
                'severity' => 'info',
                'status' => 'updated',
                'title' => 'Pinned Review Removed',
                'summary' => "A pinned review was removed from {$review->product->name}.",
                'subject_type' => Review::class,
                'subject_id' => $review->id,
                'subject_label' => $review->product->name,
                'reference' => 'Review #' . $review->id,
                'target_url' => route('reviews.index', ['highlight_review' => $review->id]),
                'target_label' => 'Open Reviews',
            ]);

            return back()->with('success', 'Review unpinned.');
        }

        Review::where('product_id', $review->product_id)
            ->where('is_pinned', true)
            ->update(['is_pinned' => false]);

        $review->update(['is_pinned' => true]);

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $review->product->user_id,
            'actor_user_id' => request()->user()?->id,
            'actor_type' => SellerActivityLog::resolveActorType(request()->user(), 'owner'),
            'category' => 'operations',
            'module' => 'reviews',
            'event_type' => 'review_pinned',
            'severity' => 'success',
            'status' => 'updated',
            'title' => 'Review Pinned',
            'summary' => "A review for {$review->product->name} was pinned to the top.",
            'subject_type' => Review::class,
            'subject_id' => $review->id,
            'subject_label' => $review->product->name,
            'reference' => 'Review #' . $review->id,
            'target_url' => route('reviews.index', ['highlight_review' => $review->id]),
            'target_label' => 'Open Reviews',
        ]);

        return back()->with('success', 'Review pinned to top!');
    }
}
