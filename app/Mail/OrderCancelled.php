<?php

namespace App\Mail;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OrderCancelled extends Mailable
{
    use Queueable, SerializesModels;

    public string $orderNumber;
    public ?string $reason;

    public function __construct(Order $order, ?string $reason = null)
    {
        $this->orderNumber = $order->order_number;
        
        $rawReason = $reason ?: $order->cancellation_reason;
        if ($rawReason === 'buyer_cancelled') {
            $this->reason = 'Cancelled by customer.';
        } elseif ($rawReason === 'seller_cancelled') {
            $this->reason = 'Cancelled by seller.';
        } elseif ($rawReason === 'seller_rejected') {
            $this->reason = 'Order declined by seller.';
        } elseif ($rawReason === 'return_to_sender_failed_delivery') {
            $this->reason = 'Failed delivery hold period expired.';
        } else {
            $this->reason = $rawReason;
        }
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "Order Cancelled - {$this->orderNumber}",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.orders.cancelled',
        );
    }
}
