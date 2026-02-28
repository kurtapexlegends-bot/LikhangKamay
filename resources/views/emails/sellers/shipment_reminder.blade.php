<x-mail::message>
# Hello Artisan,

This is a friendly reminder that Order **#{{ $order->order_number }}** has been waiting for shipment for over 3 days.

Please ship this order as soon as possible to avoid cancellation and keep your customers happy!

<x-mail::button :url="$url">
Manage Orders
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
