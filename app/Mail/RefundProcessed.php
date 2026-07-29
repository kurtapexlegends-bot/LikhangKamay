<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class RefundProcessed extends Mailable
{
    use Queueable, SerializesModels;

    public Order $order;

    public function __construct(Order $order)
    {
        $this->order = $order;
    }

    public function build()
    {
        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'refund_processed',
            replacements: [
                '{user_name}' => $this->order->customer_name ?? 'Customer',
                '{order_number}' => $this->order->order_number,
                '{refund_amount}' => number_format($this->order->total_amount, 2),
                '{action_url}' => url('/orders/' . $this->order->order_number),
            ],
            fallbackSubject: 'Update on Your Return Request - Refund Processed',
            fallbackView: 'emails.orders.refunded',
            fallbackData: ['order' => $this->order]
        );
    }
}
