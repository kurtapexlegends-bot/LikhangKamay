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
        .alert { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 16px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="logo">🏺 LikhangKamay</div>
            <div class="badge">⚠️ Return Request Received</div>
        </div>

        <p>Hello,</p>
        <p>A buyer has requested a <strong>return/refund</strong> for their order. Please review and respond promptly.</p>

        <div class="alert">
            <strong>Action Required:</strong> Chat with the buyer to understand the issue and arrange the return process.
        </div>

        <div class="order-box">
            <div class="order-number">Order #{{ $order->order_number }}</div>
            <p style="color: #6b7280; font-size: 14px;">
                <strong>Customer:</strong> {{ $order->customer_name }}<br>
                <strong>Order Date:</strong> {{ $order->created_at->format('F d, Y') }}<br>
                <strong>Received:</strong> {{ $order->received_at ? $order->received_at->format('F d, Y h:i A') : 'Unknown' }}
            </p>
            
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

        <h3>Next Steps</h3>
        <ol>
            <li>Chat with the buyer to understand the reason for return</li>
            <li>Arrange pickup or return shipping</li>
            <li>Once item is received, process the refund</li>
            <li>Update the order status accordingly</li>
        </ol>

        <div style="text-align: center;">
            <a href="{{ url('/orders') }}" class="cta">View Order Details →</a>
        </div>

        <div class="footer">
            <p>Please respond to returnswithin 24 hours.</p>
            <p>© {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
