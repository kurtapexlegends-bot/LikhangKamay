<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class OrderCancelled extends Mailable
{
    use Queueable, SerializesModels;

    public Order $order;
    public ?string $reason;

    public function __construct(Order $order, ?string $reason = null)
    {
        $this->order = $order;
        $this->reason = $reason;
    }

    public function build()
    {
        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'order_cancelled',
            replacements: [
                '{user_name}' => $this->order->customer_name ?? 'Customer',
                '{order_number}' => $this->order->order_number,
                '{rejection_reason}' => $this->reason ?? 'Cancelled by request.',
                '{action_url}' => url('/orders/' . $this->order->order_number),
            ],
            fallbackSubject: 'Order Cancelled - ' . $this->order->order_number,
            fallbackView: 'emails.orders.cancelled',
            fallbackData: [
                'order' => $this->order,
                'reason' => $this->reason,
            ]
        );
    }
}
