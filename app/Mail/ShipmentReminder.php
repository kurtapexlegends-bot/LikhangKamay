<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ShipmentReminder extends Mailable
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
            slug: 'shipment_reminder',
            replacements: [
                '{user_name}' => 'Artisan',
                '{order_number}' => $this->order->order_number,
                '{action_url}' => route('seller.dashboard'),
            ],
            fallbackSubject: 'Action Required: Ship Order #' . $this->order->order_number,
            fallbackView: 'emails.sellers.shipment_reminder',
            fallbackData: ['order' => $this->order]
        );
    }
}
