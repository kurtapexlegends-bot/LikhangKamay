<?php

namespace App\Mail;

use App\Models\Product;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
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

    public function build()
    {
        $statusLabel = match($this->status) {
            'approve', 'approved' => 'Approved',
            'reject', 'rejected' => 'Rejected',
            'flag', 'flagged' => 'Flagged',
            default => ucfirst($this->status),
        };

        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'product_moderation',
            replacements: [
                '{product_name}' => $this->productName,
                '{rejection_reason}' => $this->reason ?? 'Status: ' . $statusLabel,
                '{action_url}' => route('products.index'),
            ],
            fallbackSubject: "Listing {$statusLabel} - {$this->productName}",
            fallbackView: 'emails.artisan.product-moderation',
            fallbackData: [
                'status' => $this->status,
                'productName' => $this->productName,
                'reason' => $this->reason,
            ]
        );
    }
}
