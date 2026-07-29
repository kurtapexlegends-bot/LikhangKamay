<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderShipped extends Mailable
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
            slug: 'order_shipped',
            replacements: [
                '{user_name}' => $this->order->customer_name ?? 'Customer',
                '{order_number}' => $this->order->order_number,
                '{tracking_number}' => $this->order->tracking_number ?? 'N/A',
                '{action_url}' => url('/orders/' . $this->order->order_number),
            ],
            fallbackSubject: 'Your Order Has Been Shipped - ' . $this->order->order_number,
            fallbackView: 'emails.orders.shipped',
            fallbackData: ['order' => $this->order]
        );
    }
}
