<?php

namespace App\Mail;

use App\Models\SponsorshipRequest;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class SponsorshipStatusUpdated extends Mailable
{
    use Queueable, SerializesModels;

    public string $status;
    public string $productName;
    public ?string $reason;

    public function __construct(SponsorshipRequest $request)
    {
        $this->status = $request->status;
        $this->productName = $request->product?->name ?? 'your product';
        $this->reason = $request->rejection_reason;
    }

    public function build()
    {
        $subject = $this->status === 'approved' 
            ? 'Sponsorship Approved' 
            : 'Sponsorship Request Update';

        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'sponsorship_status',
            replacements: [
                '{product_name}' => $this->productName,
                '{rejection_reason}' => $this->reason ?? 'Status updated to ' . $this->status,
                '{action_url}' => route('seller.sponsorships'),
            ],
            fallbackSubject: $subject,
            fallbackView: 'emails.artisan.sponsorship-status',
            fallbackData: [
                'status' => $this->status,
                'productName' => $this->productName,
                'reason' => $this->reason,
            ]
        );
    }
}
