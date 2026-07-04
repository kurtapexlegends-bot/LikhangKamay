<?php

namespace App\Mail;

use App\Models\SponsorshipRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
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

    public function envelope(): Envelope
    {
        $subject = $this->status === 'approved' 
            ? 'Sponsorship Approved' 
            : 'Sponsorship Request Update';

        return new Envelope(
            subject: $subject,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.artisan.sponsorship-status',
        );
    }
}
