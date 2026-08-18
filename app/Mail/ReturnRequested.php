<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ReturnRequested extends Mailable
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
            slug: 'return_requested',
            replacements: [
                '{user_name}' => 'Artisan',
                '{order_number}' => $this->order->order_number,
                '{action_url}' => route('orders.index'),
            ],
            fallbackSubject: 'Return Requested for Order #' . $this->order->order_number,
            fallbackView: 'emails.orders.return-requested',
            fallbackData: ['order' => $this->order]
        );
    }
}
