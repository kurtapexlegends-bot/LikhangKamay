<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation & Receipt #{{ $order->order_number }}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 24px; text-align: center;">
            <a href="{{ url('/') }}" style="text-decoration: none; display: inline-block; vertical-align: middle;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: collapse;">
                    <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                            <img src="https://files.catbox.moe/e56ajg.png" alt="Logo" style="height: 38px; width: 38px; display: block; border: 0; outline: none; text-decoration: none;">
                        </td>
                        <td style="vertical-align: middle; text-align: left;">
                            <span style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: bold; color: #2E2520; display: block; line-height: 1; letter-spacing: -0.5px;">LikhangKamay</span>
                        </td>
                    </tr>
                </table>
            </a>
        </div>
        <div style="padding: 40px 32px;">
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 8px; text-align: center;">Order Confirmed!</h1>
            <div style="text-align: center;">
                <span style="display: inline-block; background-color: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 12px 0 24px;">Order Placed Successfully</span>
            </div>

            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Hello <strong>{{ $order->customer_name ?: ($customerName ?? 'Valued Customer') }}</strong>,</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Thank you for supporting Filipino craftsmanship! We've received your order and notified the artisan to prepare your handcrafted items.</p>

            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 18px; font-weight: bold; color: #2E2520; border-bottom: 1px solid #E7E1D8; padding-bottom: 12px; margin-bottom: 16px;">
                    Receipt • Order #{{ $order->order_number }}
                </div>
                <p style="color: #8C827A; font-size: 13px; margin-top: -8px; margin-bottom: 16px;">
                    Placed on {{ $order->created_at ? $order->created_at->format('F d, Y • h:i A') : now()->format('F d, Y • h:i A') }}
                    @if($order->artisan && ($order->artisan->shop_name || $order->artisan->name))
                        • Artisan Shop: <strong>{{ $order->artisan->shop_name ?: ($order->artisan->name ?: ($shopName ?? 'Artisan Studio')) }}</strong>
                    @endif
                </p>

                <table style="width: 100%; border-collapse: collapse; border-spacing: 0;">
                    @forelse($order->items as $item)
                    <tr>
                        <td align="left" style="padding: 10px 0; font-size: 14px; color: #5C524A; border-bottom: 1px dashed #E7E1D8;">
                            <strong>{{ $item->product_name ?: ($item->product?->name ?? 'Handcrafted Item') }}</strong> × {{ $item->quantity }}
                        </td>
                        <td align="right" style="padding: 10px 0; font-size: 14px; color: #5C524A; border-bottom: 1px dashed #E7E1D8;">
                            ₱{{ number_format((float)($item->price * $item->quantity), 2) }}
                        </td>
                    </tr>
                    @empty
                    <tr>
                        <td colspan="2" align="center" style="padding: 12px 0; font-size: 13px; color: #8C827A;">Handcrafted items in preparation</td>
                    </tr>
                    @endforelse
                    @if(isset($order->shipping_fee_amount) && $order->shipping_fee_amount > 0)
                    <tr>
                        <td align="left" style="padding: 10px 0; font-size: 13px; color: #8C827A; border-bottom: 1px dashed #E7E1D8;">Delivery Fee</td>
                        <td align="right" style="padding: 10px 0; font-size: 13px; color: #8C827A; border-bottom: 1px dashed #E7E1D8;">₱{{ number_format($order->shipping_fee_amount, 2) }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td align="left" style="font-size: 16px; font-weight: bold; color: #A2582F; padding-top: 16px;">Total Amount</td>
                        <td align="right" style="font-size: 16px; font-weight: bold; color: #A2582F; padding-top: 16px;">₱{{ number_format($order->total_amount, 2) }}</td>
                    </tr>
                </table>

                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E7E1D8; font-size: 13px; color: #5C524A;">
                    <p style="margin: 0 0 6px;"><strong>Delivery Method:</strong> {{ $order->shipping_method ?? 'Standard Delivery' }}</p>
                    <p style="margin: 0 0 6px;"><strong>Payment Method:</strong> {{ $order->payment_method ?? 'Cash on Delivery' }}</p>
                    <p style="margin: 0;"><strong>Shipping Destination:</strong> {{ $order->shipping_address ?? 'Address on file' }}</p>
                </div>
            </div>

            <div style="text-align: center; margin: 32px 0 16px;">
                <a href="{{ route('my-orders.index') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-align: center;">View Order Details</a>
            </div>

            <p style="font-size: 13px; color: #8C827A; text-align: center; margin-top: 16px;">
                Have questions about your order? You can chat directly with your artisan through your LikhangKamay account.
            </p>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Thank you for shopping at LikhangKamay!</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Connecting you directly with passionate Cavite artisans.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
