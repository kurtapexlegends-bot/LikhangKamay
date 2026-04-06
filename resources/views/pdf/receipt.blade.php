<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Order Receipt - {{ $order->order_number }}</title>
    @php
        $merchandiseSubtotal = (float) ($order->merchandise_subtotal ?? $order->total_amount ?? 0);
        $convenienceFee = (float) ($order->convenience_fee_amount ?? 0);
        $shippingFee = (float) ($order->shipping_fee_amount ?? 0);
        $totalPaid = (float) ($order->total_amount ?? ($merchandiseSubtotal + $convenienceFee + $shippingFee));
        $shippingAddressType = $order->shipping_address_type ? ucfirst(str_replace('_', ' ', $order->shipping_address_type)) : 'Not specified';
    @endphp
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            background: white;
        }
        .header { text-align: center; margin-bottom: 36px; padding-bottom: 20px; border-bottom: 2px solid #b45309; }
        .logo { font-size: 28px; font-weight: bold; color: #b45309; }
        .receipt-title { font-size: 14px; color: #6b7280; margin-top: 8px; }
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 28px; }
        .info-block h4 { font-size: 12px; color: #9ca3af; text-transform: uppercase; margin-bottom: 4px; }
        .info-block p { font-size: 14px; color: #1f2937; }
        .address-card, .timeline { margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 12px; }
        .address-card h3, .timeline h3 { font-size: 14px; color: #6b7280; margin-bottom: 12px; text-transform: uppercase; }
        .address-type { display: inline-block; margin-bottom: 10px; padding: 4px 10px; border-radius: 999px; background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 12px; color: #6b7280; text-transform: uppercase; border-bottom: 1px solid #e5e7eb; }
        .items-table td { padding: 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        .items-table .qty { text-align: center; }
        .items-table .price { text-align: right; }
        .totals { margin-left: auto; width: 340px; }
        .totals-row { display: flex; justify-content: space-between; padding: 8px 0; font-size: 14px; }
        .totals-row.total { font-size: 18px; font-weight: bold; color: #b45309; border-top: 2px solid #e5e7eb; padding-top: 12px; margin-top: 8px; }
        .timeline-item { display: flex; align-items: center; gap: 12px; padding: 8px 0; font-size: 14px; }
        .timeline-dot { width: 12px; height: 12px; border-radius: 50%; background: #10b981; }
        .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
        @media print {
            body { padding: 20px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="text-align: center; margin-bottom: 20px;">
        <button onclick="window.print()" style="background: #b45309; color: white; padding: 12px 24px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
            Print Receipt
        </button>
    </div>

    <div class="header">
        <div class="logo">LikhangKamay</div>
        <div class="receipt-title">Order Receipt</div>
    </div>

    <div class="info-grid">
        <div class="info-block">
            <h4>Order Number</h4>
            <p>{{ $order->order_number }}</p>
        </div>
        <div class="info-block">
            <h4>Order Date</h4>
            <p>{{ $order->created_at->format('F d, Y h:i A') }}</p>
        </div>
        <div class="info-block">
            <h4>Payment Method</h4>
            <p>{{ $order->payment_method }}</p>
        </div>
        <div class="info-block">
            <h4>Status</h4>
            <p>{{ $order->status }}</p>
        </div>
    </div>

    <div class="address-card">
        <h3>Shipping Details</h3>
        <div class="address-type">{{ $shippingAddressType }}</div>
        <p><strong>{{ $order->shipping_method }}</strong></p>
        <p>{{ $order->shipping_address }}</p>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Item</th>
                <th class="qty">Qty</th>
                <th class="price">Unit Price</th>
                <th class="price">Line Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $item)
            <tr>
                <td>
                    <strong>{{ $item->product_name }}</strong>
                    @if($item->variant)
                    <br><span style="font-size: 12px; color: #6b7280;">{{ $item->variant }}</span>
                    @endif
                </td>
                <td class="qty">{{ $item->quantity }}</td>
                <td class="price">PHP {{ number_format($item->price, 2) }}</td>
                <td class="price">PHP {{ number_format($item->price * $item->quantity, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-row">
            <span>Merchandise Subtotal</span>
            <span>PHP {{ number_format($merchandiseSubtotal, 2) }}</span>
        </div>
        <div class="totals-row">
            <span>Convenience Fee (3%)</span>
            <span>PHP {{ number_format($convenienceFee, 2) }}</span>
        </div>
        <div class="totals-row">
            <span>Shipping Fee</span>
            <span>PHP {{ number_format($shippingFee, 2) }}</span>
        </div>
        <div class="totals-row total">
            <span>Total Paid</span>
            <span>PHP {{ number_format($totalPaid, 2) }}</span>
        </div>
    </div>

    <div class="timeline">
        <h3>Order Timeline</h3>
        <div class="timeline-item">
            <div class="timeline-dot"></div>
            <span><strong>Order Placed</strong> - {{ $order->created_at->format('M d, Y h:i A') }}</span>
        </div>
        @if($order->accepted_at)
        <div class="timeline-item">
            <div class="timeline-dot"></div>
            <span><strong>Accepted</strong> - {{ $order->accepted_at->format('M d, Y h:i A') }}</span>
        </div>
        @endif
        @if($order->shipped_at)
        <div class="timeline-item">
            <div class="timeline-dot"></div>
            <span><strong>Shipped</strong> - {{ $order->shipped_at->format('M d, Y h:i A') }}{{ $order->tracking_number ? ' - Tracking: '.$order->tracking_number : '' }}</span>
        </div>
        @endif
        @if($order->delivered_at)
        <div class="timeline-item">
            <div class="timeline-dot"></div>
            <span><strong>Delivered</strong> - {{ $order->delivered_at->format('M d, Y h:i A') }}</span>
        </div>
        @endif
        @if($order->received_at)
        <div class="timeline-item">
            <div class="timeline-dot"></div>
            <span><strong>Received</strong> - {{ $order->received_at->format('M d, Y h:i A') }}</span>
        </div>
        @endif
    </div>

    <div class="footer">
        <p>Thank you for shopping with LikhangKamay.</p>
        <p>Supporting Filipino artisans and handcrafted goods.</p>
        <p style="margin-top: 8px;">Generated on {{ now()->format('F d, Y h:i A') }}</p>
    </div>
</body>
</html>
