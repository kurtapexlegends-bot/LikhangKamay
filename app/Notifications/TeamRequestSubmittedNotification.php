<?php

namespace App\Notifications;

use App\Models\OwnerApproval;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TeamRequestSubmittedNotification extends Notification
{
    use Queueable;

    public function __construct(
        public OwnerApproval $approval,
        public User $requester
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
        $domainLabel = match ($this->approval->domain) {
            OwnerApproval::DOMAIN_HR_PAYROLL => 'payroll run',
            OwnerApproval::DOMAIN_STAFF_RATE => 'salary rate adjustment',
            OwnerApproval::DOMAIN_PROCUREMENT => 'materials restock',
            OwnerApproval::DOMAIN_DISCOUNT => 'promotional discount',
            OwnerApproval::DOMAIN_REFUND => 'customer refund/return',
            OwnerApproval::DOMAIN_PRODUCT_DRAFT => 'product listing draft',
            default => 'team approval',
        };

        return [
            'type' => 'owner_approval_request',
            'approval_id' => $this->approval->id,
            'domain' => $this->approval->domain,
            'status' => $this->approval->status,
            'title' => "New Team Request: {$this->approval->title}",
            'message' => "{$this->requester->name} submitted a {$domainLabel} request for your review.",
            'requester_id' => $this->requester->id,
            'requester_name' => $this->requester->name,
            'url' => route('seller.approvals.index', ['status' => 'pending']),
        ];
    }
}
