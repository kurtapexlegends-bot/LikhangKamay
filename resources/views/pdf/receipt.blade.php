<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    @php
        $isB2B = $order->isB2BOrder();
        $merchandiseSubtotal = (float) ($order->merchandise_subtotal ?? $order->total_amount ?? 0);
        $convenienceFee = (float) ($order->convenience_fee_amount ?? 0);
        $shippingFee = (float) ($order->shipping_fee_amount ?? 0);
        $totalPaid = (float) ($order->total_amount ?? ($merchandiseSubtotal + $convenienceFee + $shippingFee));
        $shippingAddressType = $order->shipping_address_type ? ucfirst(str_replace('_', ' ', $order->shipping_address_type)) : 'Standard';
        $docTitle = $isB2B ? "B2B Purchase Order & Wholesale Invoice - {$order->order_number}" : "Official Order Receipt - {$order->order_number}";
    @endphp
    <title>{{ $docTitle }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            color: #1c1917;
            max-width: 760px;
            margin: 0 auto;
            padding: 28px;
            background: white;
        }
        .header { text-align: center; margin-bottom: 20px; padding-bottom: 14px; border-bottom: 2px solid #e7d8c9; }
        .logo { font-size: 24px; font-weight: 900; color: #844d2d; letter-spacing: -0.02em; }
        .receipt-title { font-size: 11px; font-weight: 800; color: #78716c; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; }
        .b2b-badge { display: inline-block; background: #292524; color: #f5f5f4; font-size: 9px; font-weight: 900; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 6px; }
        .info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
        .info-block { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 8px; padding: 10px; }
        .info-block h4 { font-size: 9px; color: #a8a29e; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
        .info-block p { font-size: 12px; font-weight: 700; color: #1c1917; }
        
        .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .address-card { padding: 14px; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; font-size: 12px; }
        .address-card h3 { font-size: 10px; font-weight: 800; color: #78716c; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
        .party-name { font-size: 13px; font-weight: 800; color: #1c1917; margin-bottom: 2px; }
        .address-type { display: inline-block; margin-bottom: 6px; padding: 2px 8px; border-radius: 6px; background: #f5f5f4; border: 1px solid #e7e5e4; color: #44403c; font-size: 10px; font-weight: 800; text-transform: uppercase; }
        
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
        .items-table th { background: #fafaf9; padding: 10px 12px; text-align: left; font-size: 9px; font-weight: 800; color: #78716c; text-transform: uppercase; border-bottom: 1px solid #e7e5e4; }
        .items-table td { padding: 10px 12px; border-bottom: 1px dashed #e7e5e4; color: #292524; font-weight: 500; }
        .items-table .qty { text-align: center; }
        .items-table .unit { text-align: center; font-weight: 600; color: #57534e; }
        .items-table .price { text-align: right; font-weight: 700; }
        
        .totals { margin-left: auto; width: 340px; font-size: 12px; }
        .totals-row { display: flex; justify-content: space-between; padding: 5px 0; color: #57534e; }
        .totals-row.total { font-size: 15px; font-weight: 900; color: #844d2d; border-top: 2px solid #e7d8c9; padding-top: 8px; margin-top: 6px; }
        
        .footer { text-align: center; margin-top: 30px; padding-top: 14px; border-top: 1px solid #e7e5e4; font-size: 10px; color: #a8a29e; font-weight: 500; }
        
        @media print {
            body { padding: 15px; max-width: 100%; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="no-print" style="text-align: center; margin-bottom: 20px;">
        <button onclick="window.print()" style="background: #844d2d; color: white; padding: 10px 22px; border: none; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 13px;">
            {{ $isB2B ? 'Print / Export Purchase Order & Invoice' : 'Print / Export Order Receipt' }}
        </button>
    </div>

    <div class="header">
        <div class="logo">LikhangKamay</div>
        <div class="receipt-title">
            {{ $isB2B ? 'Official B2B Purchase Order & Wholesale Commercial Invoice' : 'Official E-Commerce Order Receipt' }}
        </div>
        @if($isB2B)
            <div class="b2b-badge">Artisan Material Procurement</div>
        @endif
    </div>

    <div class="info-grid">
        <div class="info-block">
            <h4>{{ $isB2B ? 'PO / Reference No.' : 'Order Number' }}</h4>
            <p>{{ $isB2B ? 'PO-' . $order->order_number : $order->order_number }}</p>
        </div>
        <div class="info-block">
            <h4>Issue Date</h4>
            <p>{{ $order->created_at ? $order->created_at->format('M d, Y h:i A') : now()->format('M d, Y') }}</p>
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

    @if($isB2B)
        <div class="parties-grid">
            <div class="address-card">
                <h3>Procuring Studio (Buyer)</h3>
                <p class="party-name">{{ $order->user?->shop_name ?: ($order->customer_name ?: 'Buyer Studio') }}</p>
                <p style="color: #57534e;">Authorized Contact: <strong>{{ $order->customer_name }}</strong></p>
                @if($order->shipping_contact_phone)
                    <p style="color: #78716c;">Phone: {{ $order->shipping_contact_phone }}</p>
                @endif
                <p style="margin-top: 4px; color: #57534e;">Destination: {{ $order->shipping_address }}</p>
            </div>

            <div class="address-card">
                <h3>Supplier Studio (Artisan Workshop)</h3>
                <p class="party-name">{{ $order->artisan?->shop_name ?: ($order->artisan?->name ?: 'Peer Artisan Studio') }}</p>
                <p style="color: #57534e;">Artisan Owner: <strong>{{ $order->artisan?->name ?: 'Artisan' }}</strong></p>
                <p style="color: #78716c;">Studio Location: {{ $order->artisan?->city ?: 'Philippines' }}</p>
                <p style="margin-top: 4px; color: #57534e;">Logistics: <strong>{{ $order->shipping_method }}</strong></p>
            </div>
        </div>
    @else
        <div class="address-card" style="margin-bottom: 20px;">
            <h3>Shipping Destination</h3>
            <div class="address-type">{{ $shippingAddressType }}</div>
            <p style="margin-top: 4px;"><strong>{{ $order->shipping_method }}</strong></p>
            <p style="color: #57534e; margin-top: 2px;">{{ $order->shipping_address }}</p>
        </div>
    @endif

    <table class="items-table">
        <thead>
            <tr>
                <th>Item Description</th>
                @if($isB2B)
                    <th class="unit">Unit</th>
                    <th class="qty">MOQ</th>
                @endif
                <th class="qty">Qty</th>
                <th class="price">{{ $isB2B ? 'Wholesale Unit Rate' : 'Unit Price' }}</th>
                <th class="price">Line Total</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $item)
            <tr>
                <td>
                    <strong>{{ $item->product_name }}</strong>
                    @if($item->variant && strtolower($item->variant) !== 'standard')
                        <br><span style="font-size: 11px; color: #78716c;">Variant: {{ $item->variant }}</span>
                    @endif
                    @if($item->is_b2b_supply)
                        <span style="font-size: 9px; font-weight: 800; color: #844d2d; text-transform: uppercase;"> · Studio Material</span>
                    @endif
                </td>
                @if($isB2B)
                    <td class="unit">{{ $item->supply_unit ?: ($item->product?->supply_unit ?: 'pcs') }}</td>
                    <td class="qty">{{ $item->product?->moq ?: 1 }}</td>
                @endif
                <td class="qty">{{ $item->quantity }}</td>
                <td class="price">PHP {{ number_format($item->price, 2) }}</td>
                <td class="price">PHP {{ number_format($item->price * $item->quantity, 2) }}</td>
            </tr>
            @endforeach
        </tbody>
    </table>

    <div class="totals">
        <div class="totals-row">
            <span>{{ $isB2B ? 'Materials Subtotal' : 'Merchandise Subtotal' }}</span>
            <span>PHP {{ number_format($merchandiseSubtotal, 2) }}</span>
        </div>
        @if($convenienceFee > 0)
        <div class="totals-row">
            <span>Payment Convenience Fee</span>
            <span>PHP {{ number_format($convenienceFee, 2) }}</span>
        </div>
        @endif
        <div class="totals-row">
            <span>Logistics & Courier Delivery</span>
            <span>PHP {{ number_format($shippingFee, 2) }}</span>
        </div>
        <div class="totals-row total">
            <span>{{ $isB2B ? 'Total Investment' : 'Total Paid' }}</span>
            <span>PHP {{ number_format($totalPaid, 2) }}</span>
        </div>
    </div>

    <div class="footer">
        @if($isB2B)
            <p>Official B2B Purchase Order & Commercial Wholesale Invoice · Verified Peer Artisan Studio Sourcing on LikhangKamay.</p>
        @else
            <p>Thank you for supporting Filipino artisans & local craft creators on LikhangKamay.</p>
        @endif
        <p style="margin-top: 4px;">Official Computer-Generated Document · Issued on {{ now()->format('F d, Y h:i A') }}</p>
    </div>
</body>
</html>
