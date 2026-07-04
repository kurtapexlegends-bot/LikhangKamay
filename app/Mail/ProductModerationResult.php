<?php

namespace App\Mail;

use App\Models\Product;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ProductModerationResult extends Mailable
{
    use Queueable, SerializesModels;

    public string $status;
    public string $productName;
    public ?string $reason;

    public function __construct(Product $product, string $status, ?string $feedback = null)
    {
        $this->status = $status;
        $this->productName = $product->name;
        $this->reason = $feedback;
    }

    public function envelope(): Envelope
    {
        $statusLabel = match($this->status) {
            'approve', 'approved' => 'Approved',
            'reject', 'rejected' => 'Rejected',
            'flag', 'flagged' => 'Flagged',
            default => ucfirst($this->status),
        };

        return new Envelope(
            subject: "Listing {$statusLabel} - {$this->productName}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.artisan.product-moderation',
        );
    }
}
