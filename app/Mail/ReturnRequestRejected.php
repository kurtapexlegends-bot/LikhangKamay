<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ReturnRequestRejected extends Mailable
{
    use Queueable, SerializesModels;

    public string $orderNumber;
    public ?string $explanation;

    public function __construct(Order $order, ?string $explanation = null)
    {
        $this->orderNumber = $order->order_number;
        $this->explanation = $explanation;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Return Request Update',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.orders.return-rejected',
        );
    }
}
