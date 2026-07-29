<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DisputeEscalated extends Mailable
{
    use Queueable, SerializesModels;

    public string $orderNumber;
    public string $reason;

    public function __construct(Order $order, string $reason)
    {
        $this->orderNumber = $order->order_number;
        $this->reason = $reason;
    }

    public function build()
    {
        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'dispute_escalated',
            replacements: [
                '{order_number}' => $this->orderNumber,
                '{rejection_reason}' => $this->reason,
                '{action_url}' => route('admin.dashboard'),
            ],
            fallbackSubject: 'New Escalated Dispute - Order #' . $this->orderNumber,
            fallbackView: 'emails.admin.dispute-escalated',
            fallbackData: [
                'orderNumber' => $this->orderNumber,
                'reason' => $this->reason,
            ]
        );
    }
}
