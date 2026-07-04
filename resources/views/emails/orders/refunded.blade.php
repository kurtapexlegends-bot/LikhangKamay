<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Refund Processed</title>
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
        <div style="padding: 40px 32px; text-align: center;">
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 20px;">Refund Processed</h1>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; text-align: left;">Hi <strong>{{ $order->customer_name }}</strong>,</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; text-align: left; line-height: 1.6;">
                Your return/refund request for Order <strong>#{{ $order->order_number }}</strong> has been approved.
            </p>

            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: left;">
                <div style="font-family: Georgia, Times, serif; font-size: 16px; font-weight: bold; color: #2E2520; border-bottom: 1px solid #E7E1D8; padding-bottom: 12px; margin-bottom: 16px;">Refund Details</div>
                <table style="width: 100%; border-collapse: collapse; border-spacing: 0;">
                    <tr>
                        <td align="left" style="padding: 6px 0; font-size: 14px; color: #8C827A; font-weight: 600;">Refunded Amount</td>
                        <td align="right" style="padding: 6px 0; font-size: 14px; color: #A2582F; font-weight: bold;">₱{{ number_format($order->total_amount, 2) }}</td>
                    </tr>
                    <tr>
                        <td align="left" style="padding: 6px 0; font-size: 14px; color: #8C827A; font-weight: 600;">Payment Method</td>
                        <td align="right" style="padding: 6px 0; font-size: 14px; color: #2E2520;">{{ $order->payment_method }}</td>
                    </tr>
                </table>
            </div>

            <p style="font-size: 14px; color: #5C524A; text-align: left; line-height: 1.6;">
                The refunded amount has been processed and is being returned to your original payment method. If you have any questions or don't see the refund within 3-5 business days, feel free to contact the seller via chat.
            </p>

            <a href="{{ url('/my-orders') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin: 20px 0; text-align: center;">View My Orders</a>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0;">Thank you for shopping with LikhangKamay!</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
