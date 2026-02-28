<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb; }
        .container { background: white; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 24px; }
        .logo { font-size: 24px; font-weight: bold; color: #b45309; }
        .badge { display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 8px; font-size: 14px; font-weight: 600; margin: 16px 0; }
        .order-box { background: #f3f4f6; border-radius: 12px; padding: 20px; margin: 20px 0; }
        .order-number { font-size: 18px; font-weight: bold; color: #1f2937; }
        .item { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .total { font-size: 18px; font-weight: bold; color: #b45309; margin-top: 16px; }
        .cta { display: inline-block; background: #b45309; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 16px; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #9ca3af; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏺 LikhangKamay</div>
            <div class="badge">🎉 New Order Received!</div>
        </div>

        <p>Hello,</p>
        <p>Great news! You have received a new order from <strong>{{ $order->customer_name }}</strong>.</p>

        <div class="order-box">
            <div class="order-number">Order #{{ $order->order_number }}</div>
            <p style="color: #6b7280; font-size: 14px;">{{ $order->created_at->format('F d, Y • h:i A') }}</p>
            
            <div style="margin-top: 16px;">
                @foreach($order->items as $item)
                <div class="item">
                    <span>{{ $item->product_name }} × {{ $item->quantity }}</span>
                    <span>₱{{ number_format($item->price * $item->quantity, 2) }}</span>
                </div>
                @endforeach
            </div>
            
            <div class="total">Total: ₱{{ number_format($order->total_amount, 2) }}</div>
        </div>

        <p><strong>Shipping Address:</strong><br>{{ $order->shipping_address }}</p>
        
        @if($order->shipping_notes)
        <p><strong>Customer Notes:</strong><br>{{ $order->shipping_notes }}</p>
        @endif

        <p><strong>Payment Method:</strong> {{ $order->payment_method }}</p>

        <p style="margin-top: 24px;">Please review and accept the order, then chat with the customer to arrange shipping.</p>

        <div style="text-align: center;">
            <a href="{{ url('/orders') }}" class="cta">View Order →</a>
        </div>

        <div class="footer">
            <p>This email was sent from LikhangKamay.</p>
            <p>© {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
