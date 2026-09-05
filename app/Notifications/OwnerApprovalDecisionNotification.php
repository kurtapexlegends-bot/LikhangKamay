<?php

namespace App\Notifications;

use App\Models\OwnerApproval;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class OwnerApprovalDecisionNotification extends Notification
{
    use Queueable;

    public function __construct(
        public OwnerApproval $approval,
        public string $status,
        public User $reviewer,
        public ?string $reason = null
    ) {}

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        $isApproved = $this->status === OwnerApproval::STATUS_APPROVED;
        $title = $isApproved
            ? "Approval Granted: {$this->approval->title}"
            : "Approval Declined: {$this->approval->title}";

        $message = $isApproved
            ? "Your request '{$this->approval->title}' was approved by {$this->reviewer->name}."
            : "Your request '{$this->approval->title}' was declined by {$this->reviewer->name}." . ($this->reason ? " Reason: {$this->reason}" : '');

        $isRestrictedStaff = ($notifiable instanceof User) && $notifiable->isStaff() && !$notifiable->canEditSellerModule('overview');

        $url = match ($this->approval->domain) {
            OwnerApproval::DOMAIN_PROCUREMENT => route('stock-requests.index'),
            OwnerApproval::DOMAIN_HR_PAYROLL, OwnerApproval::DOMAIN_STAFF_RATE => route('hr.index'),
            default => $isRestrictedStaff
                ? route('dashboard')
                : route('seller.approvals.index', ['status' => $this->status]),
        };

        return [
            'type' => 'owner_approval_decision',
            'approval_id' => $this->approval->id,
            'domain' => $this->approval->domain,
            'status' => $this->status,
            'title' => $title,
            'message' => $message,
            'reason' => $this->reason,
            'reviewer_id' => $this->reviewer->id,
            'reviewer_name' => $this->reviewer->name,
            'url' => $url,
        ];
    }
}
