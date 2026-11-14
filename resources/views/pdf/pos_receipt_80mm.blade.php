<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>POS Receipt {{ $order->order_number }}</title>
    @php
        $seller = $order->artisan;
        $shopName = $seller?->tax_business_name ?: ($seller?->shop_name ?: ($seller?->name ?: 'LikhangKamay Studio'));
        $addressParts = array_filter([
            $seller?->street_address,
            $seller?->barangay,
            $seller?->city,
            $seller?->region ?: 'Cavite',
        ], fn ($p) => filled($p));
        $shopAddress = !empty($addressParts) ? implode(', ', $addressParts) : 'Cavite Artisan Studio';
        $shopPhone = $seller?->phone_number ?: null;
        $isVatRegistered = ($order->vat_type ?? '') === 'vat_inclusive';
        $vatableSales = (float) ($order->vatable_sales ?? 0);
        $vatAmount = (float) ($order->vat_amount ?? 0);
        $vatExemptSales = (float) ($order->vat_exempt_sales ?? $order->total_amount ?? 0);
        $merchandiseSubtotal = (float) ($order->merchandise_subtotal ?? $order->total_amount ?? 0);
        $totalQty = (int) $order->items->sum('quantity');
        $printedAt = ($order->created_at ?? now())->timezone('Asia/Manila')->format('M d, Y · h:i A');
    @endphp
    <style>
        @page {
            size: portrait;
            margin: 6mm;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 11.5px;
            line-height: 1.4;
            color: #111827;
            background: #f5f5f4;
            padding: 20px 10px;
            -webkit-font-smoothing: antialiased;
        }
        .mono {
            font-family: Consolas, "Liberation Mono", Menlo, Monaco, ui-monospace, monospace;
            font-variant-numeric: tabular-nums;
        }
        .num {
            font-variant-numeric: tabular-nums;
        }
        .no-print {
            width: 80mm;
            max-width: 100%;
            margin: 0 auto 12px auto;
            display: flex;
            justify-content: space-between;
            gap: 8px;
        }
        .btn-print {
            flex: 1;
            background: #844d2d;
            color: #ffffff;
            border: none;
            border-radius: 8px;
            padding: 9px 14px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
        }
        .btn-close {
            background: #ffffff;
            color: #44403c;
            border: 1px solid #d6d3d1;
            border-radius: 8px;
            padding: 9px 14px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
        }
        .ticket {
            width: 80mm;
            max-width: 100%;
            margin: 0 auto;
            background: #ffffff;
            padding: 16px 14px;
            border: 1px solid #d6d3d1;
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
        }
        .center { text-align: center; }
        .bold { font-weight: 700; }
        .muted { color: #4b5563; font-size: 10.5px; }
        .shop-name {
            font-size: 15px;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
            color: #111827;
            margin-bottom: 2px;
        }
        .doc-banner {
            margin: 10px 0 8px 0;
            padding: 4px 6px;
            border-top: 1.5px solid #111827;
            border-bottom: 1.5px solid #111827;
            text-align: center;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.12em;
            text-transform: uppercase;
            color: #111827;
        }
        .divider {
            border-top: 1px dashed #6b7280;
            margin: 9px 0;
        }
        .meta-row {
            display: flex;
            justify-content: space-between;
            align-items: baseline;
            gap: 8px;
            margin-bottom: 3px;
            font-size: 11px;
        }
        .meta-label {
            color: #4b5563;
            flex-shrink: 0;
        }
        .meta-val {
            text-align: right;
            font-weight: 600;
            color: #111827;
            word-break: break-word;
        }
        .items-head {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            border-top: 1px dashed #374151;
            border-bottom: 1px dashed #374151;
            margin: 8px 0 6px 0;
            font-size: 9.5px;
            font-weight: 800;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            color: #374151;
        }
        .item-block {
            margin-bottom: 6px;
        }
        .item-top {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 8px;
        }
        .item-left {
            display: flex;
            align-items: flex-start;
            gap: 6px;
            min-width: 0;
        }
        .item-qty {
            font-weight: 800;
            color: #111827;
            white-space: nowrap;
        }
        .item-title {
            font-weight: 700;
            color: #111827;
            word-break: break-word;
        }
        .item-amt {
            font-weight: 700;
            white-space: nowrap;
            text-align: right;
            color: #111827;
        }
        .item-unit {
            padding-left: 22px;
            font-size: 10px;
            color: #4b5563;
        }
        .subtotal-note {
            display: flex;
            justify-content: space-between;
            font-size: 10.5px;
            color: #374151;
            margin-bottom: 4px;
        }
        .total-box {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-top: 1.5px solid #111827;
            border-bottom: 1.5px solid #111827;
            padding: 6px 0;
            margin: 6px 0 8px 0;
            font-size: 14px;
            font-weight: 800;
            color: #111827;
        }
        .paid-tag {
            display: inline-block;
            border: 1px solid #111827;
            padding: 0 4px;
            border-radius: 3px;
            font-size: 9px;
            font-weight: 800;
            letter-spacing: 0.06em;
            vertical-align: middle;
            margin-left: 4px;
        }
        .receipt-footer {
            text-align: center;
            margin-top: 10px;
            padding-top: 8px;
            border-top: 1px dashed #6b7280;
        }
        .receipt-code {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 0.1em;
            color: #374151;
            margin-bottom: 5px;
        }
        @media print {
            html, body {
                background: #ffffff;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            .no-print {
                display: none !important;
            }
            .ticket {
                width: 76mm;
                max-width: 100%;
                margin: 0 auto;
                padding: 8px 6px;
                border: none;
                border-top: 1px dashed #9ca3af;
                border-bottom: 1px dashed #9ca3af;
                box-shadow: none;
            }
        }
    </style>
    @if(request()->boolean('auto_print') || request()->boolean('print'))
        <script>
            window.addEventListener('load', function () {
                setTimeout(function () {
                    window.print();
                }, 250);
            });
        </script>
    @endif
</head>
<body>
    <div class="no-print">
        <button type="button" class="btn-print" onclick="window.print()">Print 80mm Receipt</button>
        <button type="button" class="btn-close" onclick="window.close()">Close</button>
    </div>

    <div class="ticket">
        <div class="center">
            <div class="shop-name">{{ $shopName }}</div>
            <div class="muted">{{ $shopAddress }}</div>
            @if($shopPhone)
                <div class="muted">Tel: {{ $shopPhone }}</div>
            @endif
            @if($seller?->tin)
                <div class="muted">TIN: <span class="mono">{{ $seller->tin }}</span> &middot; {{ $isVatRegistered ? 'VAT Reg.' : 'Non-VAT Reg.' }}</div>
            @else
                <div class="muted">{{ $isVatRegistered ? 'VAT Registered' : 'Non-VAT Registered' }}</div>
            @endif
        </div>

        <div class="doc-banner">{{ ($order->status === 'Cancelled' || $order->payment_status === 'refunded') ? 'Voided Walk-In Receipt' : 'Walk-In Sales Receipt' }}</div>

        <div>
            <div class="meta-row">
                <span class="meta-label">Receipt #</span>
                <span class="meta-val mono">{{ $order->order_number }}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">Date</span>
                <span class="meta-val">{{ $printedAt }}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">Customer</span>
                <span class="meta-val">{{ $order->customer_name ?: 'Walk-In Customer' }}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">Cashier</span>
                <span class="meta-val">{{ $order->processedBy?->name ?: ($seller?->name ?: 'Studio Owner') }}</span>
            </div>
            @if($order->posLocation?->name)
                <div class="meta-row">
                    <span class="meta-label">Branch</span>
                    <span class="meta-val">{{ $order->posLocation->name }}</span>
                </div>
            @endif
            @if($order->status === 'Cancelled' || $order->payment_status === 'refunded')
                @php
                    $voidApprovedBy = data_get($voidLog?->details, 'approved_by_name') ?: $voidLog?->actor?->name;
                @endphp
                @if($voidApprovedBy)
                    <div class="meta-row">
                        <span class="meta-label">Void Approved By</span>
                        <span class="meta-val">{{ $voidApprovedBy }}</span>
                    </div>
                @endif
                @if($order->cancellation_reason)
                    <div class="meta-row">
                        <span class="meta-label">Void Reason</span>
                        <span class="meta-val">{{ $order->cancellation_reason }}</span>
                    </div>
                @endif
            @endif
        </div>

        <div class="items-head">
            <span>Qty &amp; Item</span>
            <span>Amount</span>
        </div>

        @foreach($order->items as $item)
            <div class="item-block">
                <div class="item-top">
                    <div class="item-left">
                        <span class="item-qty num">{{ $item->quantity }}x</span>
                        <span class="item-title">{{ $item->product_name }}</span>
                    </div>
                    <span class="item-amt num">PHP {{ number_format((float) $item->price * (int) $item->quantity, 2) }}</span>
                </div>
                <div class="item-unit num">@ PHP {{ number_format((float) $item->price, 2) }} each</div>
            </div>
        @endforeach

        <div class="divider"></div>

        <div class="subtotal-note">
            <span>Subtotal ({{ $totalQty }} {{ $totalQty === 1 ? 'item' : 'items' }})</span>
            <span class="num">PHP {{ number_format($merchandiseSubtotal, 2) }}</span>
        </div>

        @if($isVatRegistered)
            <div class="meta-row">
                <span class="meta-label">VATable Sales</span>
                <span class="meta-val num">PHP {{ number_format($vatableSales, 2) }}</span>
            </div>
            <div class="meta-row">
                <span class="meta-label">12% VAT</span>
                <span class="meta-val num">PHP {{ number_format($vatAmount, 2) }}</span>
            </div>
        @else
            <div class="meta-row">
                <span class="meta-label">VAT-Exempt Sales</span>
                <span class="meta-val num">PHP {{ number_format($vatExemptSales, 2) }}</span>
            </div>
        @endif

        <div class="total-box">
            <span>TOTAL</span>
            <span class="num">PHP {{ number_format((float) $order->total_amount, 2) }}</span>
        </div>

        <div>
            <div class="meta-row">
                <span class="meta-label">Payment</span>
                <span class="meta-val">
                    {{ $order->payment_method }}
                    <span class="paid-tag">
                        {{ ($order->status === 'Cancelled' || $order->payment_status === 'refunded') ? 'VOIDED' : 'PAID' }}
                    </span>
                </span>
            </div>
            @if($order->payment_method === 'POS Cash')
                <div class="meta-row">
                    <span class="meta-label">Cash Tendered</span>
                    <span class="meta-val num">PHP {{ number_format((float) ($order->pos_cash_tendered ?? $order->total_amount), 2) }}</span>
                </div>
                <div class="meta-row bold">
                    <span>Change Due</span>
                    <span class="meta-val num">PHP {{ number_format((float) ($order->pos_change_amount ?? 0), 2) }}</span>
                </div>
            @elseif($order->pos_payment_reference)
                <div class="meta-row">
                    <span class="meta-label">Ref No.</span>
                    <span class="meta-val mono">{{ $order->pos_payment_reference }}</span>
                </div>
            @endif
        </div>

        <div class="receipt-footer">
            <div class="receipt-code mono">*** {{ $order->order_number }} ***</div>
            <div class="muted" style="font-weight: 600; color: #111827;">Thank you for supporting Filipino craftsmanship.</div>
            <div class="muted">LikhangKamay Walk-In Acknowledgement</div>
        </div>
    </div>
</body>
</html>
