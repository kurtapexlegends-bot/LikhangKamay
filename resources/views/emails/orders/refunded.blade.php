<x-mail::message>
# Refund Processed

Hi {{ $order->customer_name }},

Your return/refund request for Order **#{{ $order->order_number }}** has been approved.

The refund amount of **PHP {{ number_format($order->total_amount, 2) }}** has been credited to your LikhangKamay wallet.

You can use your wallet balance as a payment method for future eligible purchases.

If you have any questions, feel free to contact the seller via chat.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
