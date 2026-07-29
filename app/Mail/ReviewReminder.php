<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ReviewReminder extends Mailable
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
            slug: 'review_reminder',
            replacements: [
                '{user_name}' => $this->order->customer_name ?? 'Customer',
                '{order_number}' => $this->order->order_number,
                '{action_url}' => url('/orders/' . $this->order->order_number),
            ],
            fallbackSubject: 'How was your order from LikhangKamay?',
            fallbackView: 'emails.reviews.reminder',
            fallbackData: ['order' => $this->order]
        );
    }
}
