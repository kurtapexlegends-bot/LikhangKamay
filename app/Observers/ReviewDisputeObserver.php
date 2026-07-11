<?php

namespace App\Observers;

use App\Models\Review;
use App\Models\ReviewDispute;
use App\Models\SellerActivityLog;

class ReviewDisputeObserver
{
    public function created(ReviewDispute $dispute): void
    {
        $dispute->loadMissing('review.product');

        if ($dispute->review && $dispute->review->product) {
            SellerActivityLog::recordEvent([
                'seller_owner_id' => $dispute->review->product->user_id,
                'actor_user_id' => auth()->id(),
                'actor_type' => SellerActivityLog::resolveActorType(auth()->user(), 'owner'),
                'category' => 'operations',
                'module' => 'reviews',
                'event_type' => 'review_dispute_requested',
                'severity' => 'warning',
                'status' => 'pending',
                'title' => 'Review Moderation Requested',
                'summary' => "A moderation request was submitted for {$dispute->review->product->name}.",
                'subject_type' => Review::class,
                'subject_id' => $dispute->review->id,
                'subject_label' => $dispute->review->product->name,
                'reference' => 'Review #' . $dispute->review->id,
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
                'target_url' => route('reviews.index', ['highlight_review' => $dispute->review->id]),
                'target_label' => 'Open Reviews',
            ]);
        }
    }

    public function updated(ReviewDispute $dispute): void
    {
        $dispute->loadMissing('review.product');

        if ($dispute->review && $dispute->review->product && $dispute->wasChanged(['reason', 'details'])) {
            $before = [];
            if ($dispute->wasChanged('reason')) {
                $before['reason'] = $dispute->getOriginal('reason');
            }
            if ($dispute->wasChanged('details')) {
                $before['details'] = $dispute->getOriginal('details');
            }

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $dispute->review->product->user_id,
                'actor_user_id' => auth()->id(),
                'actor_type' => SellerActivityLog::resolveActorType(auth()->user(), 'owner'),
                'category' => 'operations',
                'module' => 'reviews',
                'event_type' => 'review_dispute_updated',
                'severity' => 'info',
                'status' => $dispute->status,
                'title' => 'Review Moderation Request Updated',
                'summary' => "A moderation request was updated for {$dispute->review->product->name}.",
                'subject_type' => Review::class,
                'subject_id' => $dispute->review->id,
                'subject_label' => $dispute->review->product->name,
                'reference' => 'Review #' . $dispute->review->id,
                'details' => [
                    'before' => $before,
                    'after' => [
                        'reason' => $dispute->reason,
                        'details' => $dispute->details,
                    ],
                    'lines' => array_values(array_filter([
                        'Reason: ' . $dispute->reason,
                        $dispute->details ? 'Details: ' . $dispute->details : null,
                    ])),
                ],
                'target_url' => route('reviews.index', ['highlight_review' => $dispute->review->id]),
                'target_label' => 'Open Reviews',
            ]);
        }
    }

    public function deleted(ReviewDispute $dispute): void
    {
        $dispute->loadMissing('review.product');

        if ($dispute->review && $dispute->review->product) {
            SellerActivityLog::recordEvent([
                'seller_owner_id' => $dispute->review->product->user_id,
                'actor_user_id' => auth()->id(),
                'actor_type' => SellerActivityLog::resolveActorType(auth()->user(), 'owner'),
                'category' => 'operations',
                'module' => 'reviews',
                'event_type' => 'review_dispute_removed',
                'severity' => 'warning',
                'status' => 'removed',
                'title' => 'Review Moderation Request Removed',
                'summary' => "An open moderation request was removed for {$dispute->review->product->name}.",
                'subject_type' => Review::class,
                'subject_id' => $dispute->review->id,
                'subject_label' => $dispute->review->product->name,
                'reference' => 'Review #' . $dispute->review->id,
                'details' => [
                    'before' => [
                        'reason' => $dispute->reason,
                        'details' => $dispute->details,
                    ],
                    'lines' => array_values(array_filter([
                        'Removed open moderation request.',
                        $dispute->reason ? 'Reason: ' . $dispute->reason : null,
                    ])),
                ],
                'target_url' => route('reviews.index', ['highlight_review' => $dispute->review->id]),
                'target_label' => 'Open Reviews',
            ]);
        }
    }
}
