<?php

namespace App\Notifications;

use App\Models\SponsorshipRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SponsorshipStatusNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected SponsorshipRequest $requestRecord
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $isApproved = $this->requestRecord->status === 'approved';
        $productName = $this->requestRecord->product?->name ?? 'your product';

        return [
            'type' => 'sponsorship_status',
            'title' => $isApproved ? 'Sponsorship Approved' : 'Sponsorship Rejected',
            'message' => $isApproved
                ? "Your sponsorship request for {$productName} has been approved for 7 days."
                : "Your sponsorship request for {$productName} was rejected. {$this->requestRecord->rejection_reason}",
            'url' => route('seller.sponsorships') . '#request-' . $this->requestRecord->id,
            'sponsorship_request_id' => $this->requestRecord->id,
            'status' => $this->requestRecord->status,
            'rejection_reason' => $this->requestRecord->rejection_reason,
        ];
    }
}
