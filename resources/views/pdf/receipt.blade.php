<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Official Order Receipt - {{ $order->order_number }}</title>
    @php
        $merchandiseSubtotal = (float) ($order->merchandise_subtotal ?? $order->total_amount ?? 0);
        $convenienceFee = (float) ($order->convenience_fee_amount ?? 0);
        $shippingFee = (float) ($order->shipping_fee_amount ?? 0);
        $totalPaid = (float) ($order->total_amount ?? ($merchandiseSubtotal + $convenienceFee + $shippingFee));
        $shippingAddressType = $order->shipping_address_type ? ucfirst(str_replace('_', ' ', $order->shipping_address_type)) : 'Standard';
    @endphp
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            color: #1c1917;
            max-width: 720px;
            margin: 0 auto;
            padding: 30px;
            background: white;
        }
        .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e7d8c9; }
        .logo { font-size: 24px; font-weight: 900; color: #844d2d; letter-spacing: -0.02em; }
        .receipt-title { font-size: 11px; font-weight: 800; color: #78716c; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; }
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
        .info-block { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 10px; }
        .info-block h4 { font-size: 9px; color: #a8a29e; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
        .info-block p { font-size: 12px; font-weight: 700; color: #1c1917; }
        .address-card { margin-bottom: 24px; padding: 16px; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; font-size: 12px; }
        .address-card h3 { font-size: 10px; font-weight: 800; color: #78716c; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
        .address-type { display: inline-block; margin-bottom: 6px; padding: 2px 8px; border-radius: 6px; background: #f5f5f4; border: 1px solid #e7e5e4; color: #44403c; font-size: 10px; font-weight: 800; text-transform: uppercase; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
        .items-table th { background: #fafaf9; padding: 10px 12px; text-align: left; font-size: 9px; font-weight: 800; color: #78716c; text-transform: uppercase; border-bottom: 1px solid #e7e5e4; }
        .items-table td { padding: 10px 12px; border-bottom: 1px dashed #e7e5e4; color: #292524; font-weight: 500; }
        .items-table .qty { text-align: center; }
        .items-table .price { text-align: right; font-weight: 700; }
        .totals { margin-left: auto; width: 320px; font-size: 12px; }
        .totals-row { display: flex; justify-content: space-between; padding: 6px 0; color: #57534e; }
        .totals-row.total { font-size: 16px; font-weight: 900; color: #844d2d; border-top: 2px solid #e7d8c9; padding-top: 10px; margin-top: 6px; }
        .footer { text-align: center; margin-top: 36px; padding-top: 16px; border-top: 1px solid #e7e5e4; font-size: 10px; color: #a8a29e; font-weight: 500; }
        @media print {
            body { padding: 15px; }
            .no-print { display: none; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="text-align: center; margin-bottom: 20px;">
        <button onclick="window.print()" style="background: #844d2d; color: white; padding: 10px 20px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px;">
            Print / Export Order Receipt
        </button>
    </div>

    <div class="header">
        <div class="logo">LikhangKamay</div>
        <div class="receipt-title">Official E-Commerce Order Receipt</div>
    </div>

    <div class="info-grid">
        <div class="info-block">
            <h4>Order Number</h4>
            <p>{{ $order->order_number }}</p>
        </div>
        <div class="info-block">
            <h4>Order Date</h4>
            <p>{{ $order->created_at->format('M d, Y h:i A') }}</p>
        </div>
        <div class="info-block">
            <h4>Payment Method</h4>
            <p>{{ $order->payment_method }}</p>
        </div>
        <div class="info-block">
            <h4>Fulfillment Status</h4>
            <p>{{ $order->status }}</p>
        </div>
    </div>

    <div class="address-card">
        <h3>Shipping Destination</h3>
        <div class="address-type">{{ $shippingAddressType }}</div>
        <p style="margin-top: 4px;"><strong>{{ $order->shipping_method }}</strong></p>
        <p style="color: #57534e; margin-top: 2px;">{{ $order->shipping_address }}</p>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Item Description</th>
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
                    <br><span style="font-size: 11px; color: #78716c;">Variant: {{ $item->variant }}</span>
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
        @if($convenienceFee > 0)
        <div class="totals-row">
            <span>Convenience Fee</span>
            <span>PHP {{ number_format($convenienceFee, 2) }}</span>
        </div>
        @endif
        <div class="totals-row">
            <span>Logistics & Shipping Fee</span>
            <span>PHP {{ number_format($shippingFee, 2) }}</span>
        </div>
        <div class="totals-row total">
            <span>Total Paid</span>
            <span>PHP {{ number_format($totalPaid, 2) }}</span>
        </div>
    </div>

    <div class="footer">
        <p>Thank you for supporting Filipino artisans & local craft creators on LikhangKamay.</p>
        <p style="margin-top: 4px;">Official Computer-Generated Receipt · Issued on {{ now()->format('F d, Y h:i A') }}</p>
    </div>
</body>
</html>
