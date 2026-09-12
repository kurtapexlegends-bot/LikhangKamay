<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class BuyerOrderConfirmationMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order)
    {
    }

    public function build()
    {
        $this->order->loadMissing(['items.product', 'artisan', 'user']);

        $customerName = !empty($this->order->customer_name)
            ? $this->order->customer_name
            : (!empty($this->order->shipping_recipient_name)
                ? $this->order->shipping_recipient_name
                : ($this->order->user?->name ?? 'Valued Customer'));

        $shopName = $this->order->artisan?->shop_name
            ?: ($this->order->artisan?->name ?: 'Artisan Studio');

        $totalAmountFormatted = '₱' . number_format((float) $this->order->total_amount, 2);

        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'buyer_order_confirmation',
            replacements: [
                '{user_name}' => $customerName,
                '{order_number}' => $this->order->order_number,
                '{shop_name}' => $shopName,
                '{total_amount}' => $totalAmountFormatted,
                '{action_url}' => route('my-orders.index'),
            ],
            fallbackSubject: "Order Confirmation & Receipt #{$this->order->order_number} - LikhangKamay",
            fallbackView: 'emails.orders.buyer-confirmation',
            fallbackData: [
                'order' => $this->order,
                'customerName' => $customerName,
                'shopName' => $shopName,
                'totalAmountFormatted' => $totalAmountFormatted,
            ]
        );
    }
}
