<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Order Has Been Shipped</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 24px; text-align: center;">
            <a href="#" style="text-decoration: none; display: inline-block; vertical-align: middle;">
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
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 8px; text-align: center;">Order Shipped!</h1>
            <div style="text-align: center;">
                <span style="display: inline-block; background-color: #F7F4F0; border: 1px solid #E7E1D8; color: #A2582F; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 12px 0 24px;">In Transit</span>
            </div>

            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Hello {{ $order->customer_name }},</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Exciting news! Your order has been <strong>shipped</strong> and is on its way to you.</p>

            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 18px; font-weight: bold; color: #2E2520; margin-bottom: 8px;">Order #{{ $order->order_number }}</div>
                <p style="color: #8C827A; font-size: 13px; margin: 0;">
                    Shipped: {{ now()->format('F d, Y • h:i A') }}
                </p>
            </div>

            @if($order->tracking_number)
            <div style="background-color: #F7F4F0; border: 1px solid #E7E1D8; border-radius: 8px; padding: 18px; margin: 24px 0; text-align: center;">
                <div style="font-size: 12px; color: #8C827A; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Tracking Number</div>
                <div style="font-size: 20px; font-weight: bold; color: #A2582F; letter-spacing: 1px;">{{ $order->tracking_number }}</div>
                <p style="margin: 6px 0 0 0; font-size: 12px; color: #8C827A; line-height: 1.4;">Use this to track your delivery with the courier</p>
            </div>
            @endif

            <div style="margin-top: 24px; border-top: 1px solid #E7E1D8; padding-top: 20px;">
                <div style="font-family: Georgia, Times, serif; font-size: 15px; font-weight: bold; color: #2E2520; margin-bottom: 8px;">Shipping To</div>
                <p style="font-size: 14px; color: #5C524A; margin-bottom: 0; line-height: 1.5;">{{ $order->shipping_address }}</p>
            </div>

            <h3 style="font-family: Georgia, Times, serif; font-size: 16px; margin-top: 28px; margin-bottom: 12px; color: #2E2520;">What's Next?</h3>
            <ul style="margin: 0; padding-left: 20px; color: #5C524A; font-size: 14px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">Keep an eye out for your delivery</li>
                <li style="margin-bottom: 8px;">Once you receive it, click "<strong>Order Received</strong>" on your orders page</li>
                <li>You have <strong>1 day</strong> after receiving to request a return if needed</li>
            </ul>

            <div style="text-align: center; margin-top: 24px;">
                <a href="{{ url('/my-orders') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-align: center;">Track My Order</a>
            </div>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0;">Thank you for shopping with LikhangKamay!</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
