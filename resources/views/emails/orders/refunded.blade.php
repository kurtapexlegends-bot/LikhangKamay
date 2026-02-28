<x-mail::message>
# Refund Processed

Hi {{ $order->customer_name }},

Your return/refund request for Order **#{{ $order->order_number }}** has been approved.

We are currently processing your refund for the amount of **₱{{ number_format($order->total_amount, 2) }}**.

> **Note:** Please expect the amount to be credited back to your original payment method within **10-15 working days**, depending on your bank's processing time.

If you have any questions, feel free to contact the seller via the chat.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
