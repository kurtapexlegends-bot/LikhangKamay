<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
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

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Dispute Resolved: Claim Rejected',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.orders.dispute-arbitrated-seller-wins',
        );
    }
}
