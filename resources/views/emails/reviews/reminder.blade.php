<x-mail::message>
# Hi {{ $order->customer_name }},

Thank you for supporting our local artisans! Your order **#{{ $order->order_number }}** was completed recently.

We'd love to hear about your experience. Your feedback helps our artisans grow and improve.

<x-mail::button :url="$url">
Write a Review
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
