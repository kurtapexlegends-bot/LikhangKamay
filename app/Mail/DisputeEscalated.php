<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
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

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'New Escalated Dispute',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.admin.dispute-escalated',
        );
    }
}
