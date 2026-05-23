<!DOCTYPE html>
<html lang="en">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <title>Likhang Kamay Dispatch Slip</title>
    <style>
        @page {
            margin: 20px 25px;
        }
        *, body, table, tr, td, th, div, span, strong {
            font-family: DejaVu Sans, sans-serif;
        }
        body {
            color: #292524; /* stone-900 */
            font-size: 11px;
            line-height: 1.4;
            margin: 0;
            padding: 0;
        }
        .page-break {
            page-break-after: always;
        }
        
        /* Header styles */
        .header-table {
            width: 100%;
            border-bottom: 2px solid #78350f; /* dark clay/terracotta border */
            padding-bottom: 8px;
            margin-bottom: 15px;
        }
        .brand-section {
            width: 60%;
            text-align: left;
        }
        .brand-subtitle {
            font-size: 8px;
            font-weight: 800;
            color: #78350f;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin: 0;
        }
        .shop-name {
            font-size: 18px;
            font-weight: 800;
            color: #292524;
            margin: 2px 0 0 0;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .doc-section {
            width: 40%;
            text-align: right;
            vertical-align: bottom;
        }
        .doc-title {
            font-size: 14px;
            font-weight: 900;
            color: #78350f;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin: 0;
        }
        .print-date {
            font-size: 8px;
            color: #78716c;
            margin: 2px 0 0 0;
        }

        /* Two column layout table */
        .info-table {
            width: 100%;
            margin-bottom: 15px;
            border-spacing: 0;
        }
        .info-table td {
            vertical-align: top;
            width: 50%;
            padding: 0;
        }
        .info-table td.left-col {
            padding-right: 8px;
        }
        .info-table td.right-col {
            padding-left: 8px;
        }
        .box {
            border: 1px solid #e7e5e4; /* stone-200 */
            padding: 10px 12px;
            border-radius: 6px;
            background-color: #fafaf9; /* stone-50 */
            min-height: 95px;
        }
        .box h3 {
            margin: 0 0 6px 0;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            color: #78350f;
            letter-spacing: 1px;
            border-bottom: 1px solid #e7e5e4;
            padding-bottom: 3px;
        }
        .details-grid {
            width: 100%;
            border-spacing: 0;
        }
        .details-grid td {
            padding: 2.5px 0;
            font-size: 10.5px;
        }
        .details-grid td.label {
            font-weight: bold;
            color: #57534e;
            width: 95px;
        }
        .details-grid td.value {
            color: #292524;
        }
        .shipping-address {
            font-size: 10.5px;
            color: #292524;
            line-height: 1.35;
        }

        /* Items table */
        .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 15px;
        }
        .items-table th {
            background-color: #f5f5f4; /* stone-100 */
            border: 1px solid #e7e5e4;
            padding: 6px 8px;
            text-align: left;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            color: #57534e;
            letter-spacing: 0.5px;
        }
        .items-table td {
            border: 1px solid #e7e5e4;
            padding: 6px 8px;
            font-size: 10.5px;
            vertical-align: middle;
        }
        .qty {
            text-align: center;
            font-weight: 800;
            width: 45px;
            background-color: #fafaf9;
            color: #78350f;
        }
        .price, .subtotal {
            text-align: right;
            width: 80px;
        }
        .subtotal {
            font-weight: bold;
        }

        /* Summary and sign-off row */
        .bottom-section-table {
            width: 100%;
            margin-bottom: 15px;
        }
        .bottom-section-table td {
            vertical-align: top;
            padding: 0;
        }
        .logistics-box {
            width: 55%;
            padding-right: 15px;
        }
        .totals-box {
            width: 45%;
        }

        /* Logistics Signature Fields */
        .logistics-card {
            border: 1px dashed #d6d3d1; /* stone-300 */
            border-radius: 6px;
            padding: 10px 12px;
            background-color: #ffffff;
        }
        .logistics-card h4 {
            margin: 0 0 8px 0;
            font-size: 9px;
            font-weight: 800;
            color: #78716c;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .sig-line-table {
            width: 100%;
            border-spacing: 0;
        }
        .sig-line-table td {
            padding: 4px 0;
            font-size: 10px;
        }
        .sig-label {
            color: #57534e;
            width: 65px;
        }
        .sig-underline {
            border-bottom: 1px solid #d6d3d1;
            width: auto;
        }

        /* Totals */
        .totals-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10.5px;
        }
        .totals-table td {
            padding: 3.5px 6px;
            text-align: right;
        }
        .totals-table td.label {
            color: #57534e;
        }
        .totals-table td.value {
            font-weight: bold;
        }
        .totals-table .total-row td {
            font-weight: bold;
            font-size: 12px;
            color: #78350f;
            border-top: 1.5px solid #78350f;
            padding-top: 6px;
            background-color: #fafaf9;
        }

        /* Footer */
        .footer {
            text-align: center;
            margin-top: 25px;
            padding-top: 10px;
            border-top: 1px dashed #e7e5e4;
            color: #a8a29e;
            font-size: 9px;
            font-weight: 500;
            letter-spacing: 0.3px;
        }
    </style>
</head>
<body>

@foreach($orders as $index => $order)
    @php
        $totalWeight = $order->items->sum(function($item) {
            return $item->quantity * ($item->product->weight ?? 0);
        }) / 1000;
    @endphp
    <!-- Header -->
    <table class="header-table">
        <tr>
            <td class="brand-section">
                <p class="brand-subtitle">Likhang Kamay Marketplace</p>
                <h1 class="shop-name">{{ $artisan->name }}</h1>
            </td>
            <td class="doc-section">
                <h2 class="doc-title">Dispatch Slip</h2>
                <p class="print-date">Printed: {{ now()->timezone('Asia/Manila')->format('M d, Y h:i A') }}</p>
            </td>
        </tr>
    </table>

    <!-- Info Grid -->
    <table class="info-table">
        <tr>
            <!-- Left Box: Dispatch Details -->
            <td class="left-col">
                <div class="box">
                    <h3>Dispatch Details</h3>
                    <table class="details-grid">
                        <tr>
                            <td class="label">Order Number:</td>
                            <td class="value" style="font-family: monospace; font-weight: bold; font-size: 11px;">{{ $order->order_number }}</td>
                        </tr>
                        <tr>
                            <td class="label">Date Ordered:</td>
                            <td class="value">{{ $order->created_at->timezone('Asia/Manila')->format('M d, Y h:i A') }}</td>
                        </tr>
                        <tr>
                            <td class="label">Payment Type:</td>
                            <td class="value" style="font-weight: bold; font-size: 10px;">{{ strtoupper($order->payment_method) }}</td>
                        </tr>
                        <tr>
                            <td class="label">Logistics/Courier:</td>
                            <td class="value" style="font-weight: bold; color: #78350f;">{{ $order->delivery->courier_name ?? 'Standard Courier' }}</td>
                        </tr>
                    </table>
                </div>
            </td>
            
            <!-- Right Box: Shipping Address -->
            <td class="right-col">
                <div class="box">
                    <h3>Shipping Information</h3>
                    <div class="shipping-address">
                        <strong style="font-size: 11px; color: #1c1917;">{{ $order->shipping_recipient_name ?? $order->customer_name }}</strong><br>
                        
                        @if($order->shipping_contact_phone)
                            <span style="color: #78350f; font-weight: bold; font-size: 10px;">{{ $order->shipping_contact_phone }}</span><br>
                        @elseif($order->user && $order->user->phone)
                            <span style="color: #78350f; font-weight: bold; font-size: 10px;">{{ $order->user->phone }}</span><br>
                        @endif
                        
                        <div style="margin-top: 3px; color: #44403c;">
                            @if($order->shipping_method === 'Pick Up')
                                <span style="color: #b45309; font-weight: bold; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px;">Customer Pick Up</span><br>
                                <span style="color: #78716c; font-style: italic; font-size: 9px;">Item will be collected from shop.</span>
                            @else
                                @if($order->shipping_street_address || $order->shipping_barangay || $order->shipping_city || $order->shipping_region || $order->shipping_postal_code)
                                    @if($order->shipping_street_address)
                                        {{ $order->shipping_street_address }}<br>
                                    @endif
                                    
                                    @if($order->shipping_barangay && $order->shipping_city)
                                        {{ $order->shipping_barangay }}, {{ $order->shipping_city }}<br>
                                    @elseif($order->shipping_barangay)
                                        {{ $order->shipping_barangay }}<br>
                                    @elseif($order->shipping_city)
                                        {{ $order->shipping_city }}<br>
                                    @endif
                                    
                                    @if($order->shipping_region && $order->shipping_postal_code)
                                        {{ $order->shipping_region }} {{ $order->shipping_postal_code }}
                                    @else
                                        {{ $order->shipping_region }}{{ $order->shipping_postal_code }}
                                    @endif
                                @elseif($order->shipping_address)
                                    {{ $order->shipping_address }}
                                @else
                                    <span style="color: #a8a29e; font-style: italic; font-size: 9px;">No shipping address provided</span>
                                @endif
                            @endif
                        </div>
                    </div>
                </div>
            </td>
        </tr>
    </table>

    <!-- Items List -->
    <table class="items-table">
        <thead>
            <tr>
                <th class="qty">QTY</th>
                <th>Product Description</th>
                <th style="text-align: right;">Unit Price</th>
                <th style="text-align: right;">Subtotal</th>
            </tr>
        </thead>
        <tbody>
            @foreach($order->items as $item)
                <tr>
                    <td class="qty">{{ $item->quantity }}</td>
                    <td>
                        <strong style="color: #1c1917; font-size: 11px;">{{ $item->product_name }}</strong>
                    </td>
                    <td class="price">&#8369;{{ number_format($item->price, 2) }}</td>
                    <td class="subtotal">&#8369;{{ number_format($item->price * $item->quantity, 2) }}</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <!-- Bottom Section: Logistics Sign-off + Totals -->
    <table class="bottom-section-table">
        <tr>
            <!-- Left Side: Logistics Checklist -->
            <td class="logistics-box">
                <div class="logistics-card">
                    <h4>Logistics Audit Panel</h4>
                    <table class="sig-line-table">
                        <tr>
                            <td class="sig-label">Packed By:</td>
                            <td class="sig-underline"></td>
                        </tr>
                        <tr>
                            <td class="sig-label">Checked By:</td>
                            <td class="sig-underline"></td>
                        </tr>
                        <tr>
                            <td class="sig-label">Gross Weight:</td>
                            <td class="sig-underline" style="font-size: 10px; font-weight: bold; color: #292524; vertical-align: bottom; border-bottom: 1px solid #d6d3d1;">
                                {{ number_format($totalWeight, 2) }} kg
                            </td>
                        </tr>
                    </table>
                </div>
            </td>

            <!-- Right Side: Totals -->
            <td class="totals-box">
                <table class="totals-table">
                    <tr>
                        <td class="label">Merchandise Subtotal:</td>
                        <td class="value">&#8369;{{ number_format($order->merchandise_subtotal, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="label">Shipping Fee:</td>
                        <td class="value">&#8369;{{ number_format($order->shipping_fee_amount, 2) }}</td>
                    </tr>
                    <tr>
                        <td class="label">Convenience Fee:</td>
                        <td class="value">&#8369;{{ number_format($order->convenience_fee_amount, 2) }}</td>
                    </tr>
                    <tr class="total-row">
                        <td>Grand Total:</td>
                        <td>&#8369;{{ number_format($order->total_amount, 2) }}</td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <!-- Footer -->
    <div class="footer">
        Thank you for supporting hand-crafted art and local communities!<br>
        Likhang Kamay Platform Dispatch Service &bull; Secure & Authentic
    </div>

    @if(!$loop->last)
        <div class="page-break"></div>
    @endif
@endforeach

</body>
</html>
