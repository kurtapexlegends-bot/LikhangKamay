<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Accepted</title>
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
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 8px; text-align: center;">Order Accepted!</h1>
            <div style="text-align: center;">
                <span style="display: inline-block; background-color: #F7F4F0; border: 1px solid #E7E1D8; color: #A2582F; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 12px 0 24px;">Processing Order</span>
            </div>

            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Hello {{ $order->customer_name }},</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Great news! The seller has <strong>accepted your order</strong>. They are now preparing your handcrafted items for shipping.</p>

            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 18px; font-weight: bold; color: #2E2520; border-bottom: 1px solid #E7E1D8; padding-bottom: 12px; margin-bottom: 16px;">Order #{{ $order->order_number }}</div>
                
                <table style="width: 100%; border-collapse: collapse; border-spacing: 0;">
                    @foreach($order->items as $item)
                    <tr>
                        <td align="left" style="padding: 10px 0; font-size: 14px; color: #5C524A; border-bottom: 1px dashed #E7E1D8;">{{ $item->product_name }} × {{ $item->quantity }}</td>
                        <td align="right" style="padding: 10px 0; font-size: 14px; color: #5C524A; border-bottom: 1px dashed #E7E1D8;">₱{{ number_format($item->price * $item->quantity, 2) }}</td>
                    </tr>
                    @endforeach
                    <tr>
                        <td align="left" style="font-size: 16px; font-weight: bold; color: #A2582F; padding-top: 16px;">Total</td>
                        <td align="right" style="font-size: 16px; font-weight: bold; color: #A2582F; padding-top: 16px;">₱{{ number_format($order->total_amount, 2) }}</td>
                    </tr>
                </table>
            </div>

            <div style="margin-top: 28px; border-top: 1px solid #E7E1D8; padding-top: 24px;">
                <div style="font-family: Georgia, Times, serif; font-size: 16px; font-weight: bold; color: #2E2520; margin-bottom: 16px;">Order Status</div>
                <div style="margin-bottom: 12px; font-size: 14px; color: #5C524A; line-height: 1.5;">
                    <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; font-size: 11px; margin-right: 8px; font-weight: bold; background-color: #E7E1D8; color: #2E2520;">✓</span> Order Placed
                </div>
                <div style="margin-bottom: 12px; font-size: 14px; color: #5C524A; line-height: 1.5;">
                    <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; font-size: 11px; margin-right: 8px; font-weight: bold; background-color: #E7E1D8; color: #2E2520;">✓</span> Seller Accepted
                </div>
                <div style="margin-bottom: 12px; font-size: 14px; color: #2E2520; font-weight: bold; line-height: 1.5;">
                    <span style="display: inline-block; width: 18px; height: 18px; line-height: 18px; text-align: center; border-radius: 50%; font-size: 11px; margin-right: 8px; font-weight: bold; background-color: #C2783F; color: #ffffff;">●</span> Preparing & Shipping
                </div>
            </div>

            <p style="margin-top: 24px; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">You can chat directly with the seller to coordinate delivery details or track your shipment status.</p>

            <div style="text-align: center; margin-top: 24px;">
                <a href="{{ url('/my-orders') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-align: center;">Track My Order</a>
            </div>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0; font-size: 12px; color: #8C827A;">Thank you for shopping with LikhangKamay!</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
