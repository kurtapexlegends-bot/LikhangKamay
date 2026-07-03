<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Return Requested</title>
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
                            <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 9px; font-weight: bold; color: #A2582F; display: block; letter-spacing: 1px; text-transform: uppercase; margin-top: 3px;">Artisan Marketplace</span>
                        </td>
                    </tr>
                </table>
            </a>
        </div>
        <div style="padding: 40px 32px;">
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #C2783F; margin-top: 0; margin-bottom: 8px; text-align: center;">Return Requested</h1>
            <div style="text-align: center;">
                <span style="display: inline-block; background-color: #FFFDFB; border: 1px solid #E7E1D8; color: #C2783F; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 12px 0 24px;">Dispute Initiated</span>
            </div>

            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Hello,</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">A buyer has requested a <strong>return/refund</strong> for their order. Please review and respond promptly.</p>

            <div style="background-color: #F7F4F0; border-left: 3px solid #C2783F; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; font-size: 14px; color: #7C6D62; line-height: 1.5;">
                <strong>Action Required:</strong> Chat with the buyer to understand the issue and coordinate the return process.
            </div>

            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 18px; font-weight: bold; color: #2E2520; border-bottom: 1px solid #E7E1D8; padding-bottom: 12px; margin-bottom: 16px;">Order #{{ $order->order_number }}</div>
                
                <table style="width: 100%; margin-bottom: 16px;">
                    <tr>
                        <td width="35%" style="padding: 4px 0; font-size: 14px; color: #8C827A; font-weight: 600; text-align: left;">Customer</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #2E2520; text-align: left;">{{ $order->customer_name }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #8C827A; font-weight: 600; text-align: left;">Order Date</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #2E2520; text-align: left;">{{ $order->created_at->format('F d, Y') }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 4px 0; font-size: 14px; color: #8C827A; font-weight: 600; text-align: left;">Received</td>
                        <td style="padding: 4px 0; font-size: 14px; color: #2E2520; text-align: left;">{{ $order->received_at ? $order->received_at->format('F d, Y h:i A') : 'Unknown' }}</td>
                    </tr>
                </table>

                @if($order->return_reason)
                <div style="background-color: #F7F4F0; border: 1px solid #E7E1D8; border-radius: 8px; padding: 16px; margin: 20px 0;">
                    <div style="font-family: Georgia, Times, serif; font-weight: bold; color: #A2582F; margin-bottom: 6px; font-size: 14px;">Reason for Return</div>
                    <p style="margin: 0; color: #5C524A; font-size: 14px; line-height: 1.5;">{{ $order->return_reason }}</p>
                </div>
                @endif

                @if($order->return_proof_image)
                <div style="margin-top: 12px; font-size: 14px;">
                    <a href="{{ asset('storage/' . $order->return_proof_image) }}" style="color: #C2783F; font-weight: 600; text-decoration: underline;">
                        View buyer proof image
                    </a>
                </div>
                @endif
                
                <table style="width: 100%; margin-top: 16px; border-top: 1px solid #E7E1D8; padding-top: 16px; border-collapse: collapse; border-spacing: 0;">
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

            <h3 style="font-family: Georgia, Times, serif; font-size: 16px; margin-top: 28px; margin-bottom: 12px; color: #2E2520;">Next Steps</h3>
            <ol style="margin: 0; padding-left: 20px; color: #5C524A; font-size: 14px; line-height: 1.6;">
                <li style="margin-bottom: 8px;">Chat with the buyer to understand the reason for return</li>
                <li style="margin-bottom: 8px;">Arrange return shipping or pickup</li>
                <li style="margin-bottom: 8px;">Once the item is received, approve/reject the refund request</li>
                <li>Update the order status accordingly</li>
            </ol>

            <div style="text-align: center; margin-top: 24px;">
                <a href="{{ url('/orders') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-align: center;">View Order Details</a>
            </div>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0;">Please respond to returns within 24 hours.</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
