<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class DisputeArbitratedSellerWins extends Mailable
{
    use Queueable, SerializesModels;

    public string $orderNumber;
    public ?string $notes;

    public function __construct(Order $order, ?string $notes = null)
    {
        $this->orderNumber = $order->order_number;
        $this->notes = $notes;
    }

    public function build()
    {
        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'dispute_arbitrated',
            replacements: [
                '{order_number}' => $this->orderNumber,
                '{rejection_reason}' => $this->notes ?? 'Claim rejected upon admin review.',
                '{action_url}' => url('/orders/' . $this->orderNumber),
            ],
            fallbackSubject: 'Dispute Resolved: Claim Rejected for Order #' . $this->orderNumber,
            fallbackView: 'emails.orders.dispute-arbitrated-seller-wins',
            fallbackData: [
                'orderNumber' => $this->orderNumber,
                'notes' => $this->notes,
            ]
        );
    }
}
