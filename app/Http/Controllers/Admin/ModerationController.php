<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\ReviewDispute;
use App\Models\FlaggedContent;
use App\Models\User;
use App\Models\Product;
use App\Notifications\ReviewModerationStatusNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class ModerationController extends Controller
{
    /**
     * Unified Compliance & Governance Dashboard
     */
    public function compliance(Request $request)
    {
        Gate::authorize('admin-action');
        $flags = $this->getPendingFlags();
        $disputes = $this->getReviewDisputes();

        return Inertia::render('Admin/Compliance/ContentSafety', [
            'flags' => $flags,
            'disputes' => $disputes,
            'defaultFilter' => $request->input('filter', 'all'),
        ]);
    }

    /**
     * Get pending flags
     */
    private function getPendingFlags()
    {
        return FlaggedContent::with(['reporter:id,name', 'reportable'])
            ->where('status', 'pending')
            ->latest()
            ->paginate(15, ['*'], 'flags_page');
    }

    /**
     * Get review disputes
     */
    private function getReviewDisputes()
    {
        return ReviewDispute::query()
            ->with(['review.product.user', 'reporter'])
            ->latest()
            ->get()
            ->map(function (ReviewDispute $dispute) {
                $review = $dispute->review;
                $product = $review?->product;
                $shopOwner = $product?->user;

                return [
                    'id' => $dispute->id,
                    'status' => $dispute->status,
                    'reason' => $dispute->reason,
                    'details' => $dispute->details ?? $dispute->explanation,
                    'resolution_notes' => $dispute->resolution_notes,
                    'reported_at' => $dispute->created_at?->toIso8601String(),
                    'resolved_at' => $dispute->resolved_at?->toIso8601String(),
                    'reported_by' => $dispute->reporter?->name ?? 'Unknown user',
                    'shop_name' => $shopOwner?->shop_name ?? $shopOwner?->name ?? 'Unknown shop',
                    'product_name' => $product?->name ?? 'Unknown product',
                    'product_slug' => $product?->slug,
                    'product_id' => $product?->id,
                    'review_id' => $review?->id,
                    'review_rating' => $review?->rating,
                    'review_comment' => $review?->comment,
                    'review_hidden_from_marketplace' => (bool) ($review?->is_hidden_from_marketplace ?? false),
                ];
            })
            ->values();
    }

    /**
     * Review Moderation Dashboard
     */
    public function reviewIndex()
    {
        Gate::authorize('admin-action');
        $disputes = ReviewDispute::query()
            ->with(['review.product.user', 'reporter'])
            ->latest()
            ->get()
            ->map(function (ReviewDispute $dispute) {
                $review = $dispute->review;
                $product = $review?->product;
                $shopOwner = $product?->user;

                return [
                    'id' => $dispute->id,
                    'status' => $dispute->status,
                    'reason' => $dispute->reason,
                    'details' => $dispute->details ?? $dispute->explanation,
                    'resolution_notes' => $dispute->resolution_notes,
                    'reported_at' => $dispute->created_at?->toIso8601String(),
                    'resolved_at' => $dispute->resolved_at?->toIso8601String(),
                    'reported_by' => $dispute->reporter?->name ?? 'Unknown user',
                    'shop_name' => $shopOwner?->shop_name ?? $shopOwner?->name ?? 'Unknown shop',
                    'product_name' => $product?->name ?? 'Unknown product',
                    'product_slug' => $product?->slug,
                    'product_id' => $product?->id,
                    'review_id' => $review?->id,
                    'review_rating' => $review?->rating,
                    'review_comment' => $review?->comment,
                    'review_hidden_from_marketplace' => (bool) ($review?->is_hidden_from_marketplace ?? false),
                ];
            })
            ->values();

        return Inertia::render('Admin/Compliance/ReviewModeration', [
            'disputes' => $disputes,
        ]);
    }

    /**
     * Update review moderation status
     */
    public function updateReview(Request $request, ReviewDispute $reviewDispute)
    {
        Gate::authorize('admin-action');
        $validated = $request->validate([
            'status' => 'required|in:under_review,resolved,rejected',
            'resolution_notes' => 'nullable|string|max:1000',
        ]);

        $resolutionNotes = isset($validated['resolution_notes']) ? strip_tags($validated['resolution_notes']) : null;
        $resolvedStatuses = ['resolved', 'rejected'];
        $reviewDispute->loadMissing('review');

        DB::transaction(function () use ($request, $reviewDispute, $validated, $resolvedStatuses, $resolutionNotes) {
            $reviewDispute->update([
                'status' => $validated['status'],
                'resolution_notes' => $resolutionNotes,
                'resolved_at' => in_array($validated['status'], $resolvedStatuses, true) ? now() : null,
            ]);

            $review = $reviewDispute->review;
            if (!$review) {
                return;
            }

            $this->syncReviewMarketplaceVisibility($review, $request->user()?->id);

            if (!in_array($validated['status'], $resolvedStatuses, true)) {
                return;
            }

            if ($review->user) {
                $review->user->notify(
                    new ReviewModerationStatusNotification(
                        $review,
                        (bool) $review->fresh()->is_hidden_from_marketplace,
                    )
                );
            }
        });

        return back()->with('success', 'Moderation request updated.');
    }

    /**
     * Delete a review dispute
     */
    public function destroyReview(Request $request, ReviewDispute $reviewDispute)
    {
        Gate::authorize('admin-action');
        $reviewDispute->loadMissing('review');

        DB::transaction(function () use ($request, $reviewDispute) {
            $review = $reviewDispute->review;
            $reviewDispute->delete();

            if ($review) {
                $this->syncReviewMarketplaceVisibility($review, $request->user()?->id);
            }
        });

        return back()->with('success', 'Moderation request removed.');
    }

    /**
     * Content Flagging Queue
     */
    public function queue()
    {
        Gate::authorize('admin-action');
        $flags = FlaggedContent::with(['reporter:id,name', 'reportable'])
            ->where('status', 'pending')
            ->latest()
            ->paginate(15);

        return Inertia::render('Admin/Compliance/ModerationQueue', [
            'flags' => $flags
        ]);
    }

    /**
     * Resolve a content flag
     */
    public function resolveFlag(int|string $id)
    {
        Gate::authorize('admin-action');
        $flag = FlaggedContent::findOrFail($id);
        
        $flag->update([
            'status' => 'resolved',
            'resolved_by' => Auth::id(),
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'Content flag marked as resolved.');
    }

    /**
     * Take down a product and resolve flag
     */
    public function takedownProduct(int|string $id)
    {
        Gate::authorize('admin-action');
        $flag = FlaggedContent::findOrFail($id);
        
        if ($flag->reportable_type === 'App\Models\Product' && $flag->reportable) {
            $flag->reportable->update(['status' => 'Rejected']);
        }

        $flag->update([
            'status' => 'resolved',
            'resolved_by' => Auth::id(),
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'Product taken down and flag resolved.');
    }

    /**
     * Suspend a user and resolve flag
     */
    public function suspendUser(int|string $id)
    {
        Gate::authorize('admin-action');
        $flag = FlaggedContent::findOrFail($id);
        
        $userId = null;
        if ($flag->reportable_type === 'App\Models\Product' && $flag->reportable) {
            $userId = $flag->reportable->user_id;
        } elseif ($flag->reportable_type === 'App\Models\User') {
            $userId = $flag->reportable_id;
        }

        if ($userId) {
            $user = User::find($userId);
            if ($user) {
                $user->update(['artisan_status' => 'rejected']); 
            }
        }

        $flag->update([
            'status' => 'resolved',
            'resolved_by' => Auth::id(),
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'User suspended and flag resolved.');
    }

    /**
     * Dismiss a content flag
     */
    public function dismissFlag(int|string $id)
    {
        Gate::authorize('admin-action');
        $flag = FlaggedContent::findOrFail($id);
        
        $flag->update([
            'status' => 'dismissed',
            'resolved_by' => Auth::id(),
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'Content flag dismissed.');
    }

    /**
     * Internal helper to sync review visibility
     */
    private function syncReviewMarketplaceVisibility(Review $review, ?int $moderatorId = null): void
    {
        $review->loadMissing('product');

        $hasApprovedDispute = $review->disputes()
            ->where('status', 'resolved')
            ->exists();

        $review->update([
            'is_hidden_from_marketplace' => $hasApprovedDispute,
            'hidden_at' => $hasApprovedDispute ? ($review->hidden_at ?? now()) : null,
            'hidden_by' => $hasApprovedDispute ? ($review->hidden_by ?? $moderatorId) : null,
            'is_pinned' => $hasApprovedDispute ? false : $review->is_pinned,
        ]);
    }
}
