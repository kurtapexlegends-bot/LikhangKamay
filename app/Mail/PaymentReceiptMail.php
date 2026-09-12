<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class PaymentReceiptMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Order $order)
    {
    }

    public function build()
    {
        $this->order->loadMissing(['user', 'artisan', 'items.product']);

        $customerName = !empty($this->order->customer_name)
            ? $this->order->customer_name
            : (!empty($this->order->shipping_recipient_name)
                ? $this->order->shipping_recipient_name
                : ($this->order->user?->name ?? 'Valued Customer'));

        $paymentId = !empty($this->order->payment_id)
            ? $this->order->payment_id
            : (!empty($this->order->paymongo_session_id)
                ? $this->order->paymongo_session_id
                : 'PAY-' . strtoupper(substr(md5((string)$this->order->id . $this->order->order_number), 0, 10)));

        $paymentMethod = !empty($this->order->payment_method)
            ? $this->order->payment_method
            : 'Online Payment';

        $totalAmountFormatted = '₱' . number_format((float) $this->order->total_amount, 2);

        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'payment_receipt',
            replacements: [
                '{user_name}' => $customerName,
                '{order_number}' => $this->order->order_number,
                '{payment_id}' => $paymentId,
                '{payment_method}' => $paymentMethod,
                '{total_amount}' => $totalAmountFormatted,
                '{action_url}' => route('my-orders.index'),
            ],
            fallbackSubject: "Payment Receipt for Order #{$this->order->order_number} - LikhangKamay",
            fallbackView: 'emails.orders.payment-receipt',
            fallbackData: [
                'order' => $this->order,
                'customerName' => $customerName,
                'paymentId' => $paymentId,
                'paymentMethod' => $paymentMethod,
                'totalAmountFormatted' => $totalAmountFormatted,
            ]
        );
    }
}
