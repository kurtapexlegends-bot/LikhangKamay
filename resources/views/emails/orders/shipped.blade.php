<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .container { background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: bold; color: #b45309; }
        .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 16px 0; }
        .order-box { background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .order-number { font-size: 18px; font-weight: bold; color: #1f2937; }
        .tracking-box { background: #e0e7ff; border-radius: 12px; padding: 16px; margin: 20px 0; text-align: center; }
        .tracking-number { font-size: 20px; font-weight: bold; color: #3730a3; letter-spacing: 1px; }
        .cta { display: inline-block; background: #b45309; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏺 LikhangKamay</div>
            <div class="badge">📦 Your Order is On Its Way!</div>
        </div>

        <p>Hello {{ $order->customer_name }},</p>
        <p>Exciting news! Your order has been <strong>shipped</strong> and is on its way to you.</p>

        <div class="order-box">
            <div class="order-number">Order #{{ $order->order_number }}</div>
            <p style="color: #6b7280; font-size: 14px;">Shipped: {{ now()->format('F d, Y • h:i A') }}</p>
        </div>

        @if($order->tracking_number)
        <div class="tracking-box">
            <p style="margin: 0; font-size: 12px; color: #6b7280;">Tracking Number</p>
            <div class="tracking-number">{{ $order->tracking_number }}</div>
            <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280;">Use this to track your delivery with the courier</p>
        </div>
        @endif

        <p><strong>Shipping to:</strong><br>{{ $order->shipping_address }}</p>

        <h3 style="margin-top: 24px;">What to Do Next</h3>
        <ul>
            <li>Keep an eye out for your delivery</li>
            <li>Once you receive it, click "<strong>Order Received</strong>" in your orders page</li>
            <li>You have <strong>1 day</strong> after receiving to request a return if needed</li>
        </ul>

        <div style="text-align: center;">
            <a href="{{ url('/my-orders') }}" class="cta">Track My Order →</a>
        </div>

        <div class="footer">
            <p>Thank you for shopping with LikhangKamay!</p>
            <p>© {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
