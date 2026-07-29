<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderAccepted extends Mailable
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
            slug: 'order_accepted',
            replacements: [
                '{user_name}' => $this->order->customer_name ?? 'Customer',
                '{order_number}' => $this->order->order_number,
                '{action_url}' => url('/orders/' . $this->order->order_number),
            ],
            fallbackSubject: 'Your Order Has Been Accepted - ' . $this->order->order_number,
            fallbackView: 'emails.orders.accepted',
            fallbackData: ['order' => $this->order]
        );
    }
}
