<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Monthly Settlement Statement - {{ $data['period']['month_name'] }} - {{ $data['artisan']['shop_name'] }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            color: #1c1917;
            max-width: 820px;
            margin: 0 auto;
            padding: 28px;
            background: white;
        }
        .header { text-align: center; margin-bottom: 22px; padding-bottom: 16px; border-bottom: 2px solid #e7d8c9; position: relative; }
        .logo { font-size: 24px; font-weight: 900; color: #844d2d; letter-spacing: -0.02em; }
        .statement-title { font-size: 11px; font-weight: 800; color: #78716c; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; }
        .period-badge { display: inline-block; background: #292524; color: #f5f5f4; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; }
        
        .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
        .info-card { padding: 14px; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; font-size: 12px; }
        .info-card h3 { font-size: 10px; font-weight: 800; color: #78716c; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
        .party-name { font-size: 14px; font-weight: 800; color: #1c1917; margin-bottom: 2px; }
        
        .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 22px; }
        .summary-box { background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; padding: 12px; }
        .summary-box.highlight { background: #f0fdf4; border-color: #bbf7d0; }
        .summary-box h4 { font-size: 9px; color: #78716c; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 3px; }
        .summary-box.highlight h4 { color: #166534; }
        .summary-box .amount { font-size: 15px; font-weight: 900; color: #1c1917; font-family: monospace; }
        .summary-box.highlight .amount { color: #15803d; }
        
        .section-title { font-size: 11px; font-weight: 800; color: #44403c; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 22px; font-size: 11px; }
        .table th { background: #fafaf9; padding: 8px 10px; text-align: left; font-size: 9px; font-weight: 800; color: #78716c; text-transform: uppercase; border-bottom: 1px solid #e7e5e4; }
        .table td { padding: 8px 10px; border-bottom: 1px dashed #e7e5e4; color: #292524; font-weight: 500; }
        .table .right { text-align: right; }
        .table .center { text-align: center; }
        
        .no-data { text-align: center; padding: 16px; color: #a8a29e; font-style: italic; }
        
        .footer { text-align: center; margin-top: 30px; padding-top: 14px; border-top: 1px solid #e7e5e4; font-size: 10px; color: #a8a29e; font-weight: 500; }
        
        .print-btn {
            position: absolute;
            right: 0;
            top: 0;
            background: #844d2d;
            color: white;
            border: none;
            padding: 6px 14px;
            font-size: 11px;
            font-weight: 700;
            border-radius: 8px;
            cursor: pointer;
        }
        
        @media print {
            body { padding: 10px; max-width: 100%; }
            .no-print { display: none !important; }
        }
    </style>
</head>
<body>
    <div class="header">
        <button class="print-btn no-print" onclick="window.print()">Print Statement</button>
        <div class="logo">LIKHANGKAMAY</div>
        <div class="statement-title">Monthly Artisan Settlement &amp; Payout Statement</div>
        <div class="period-badge">{{ $data['period']['month_name'] }}</div>
    </div>

    <div class="parties-grid">
        <div class="info-card">
            <h3>Artisan Workshop</h3>
            <div class="party-name">{{ $data['artisan']['shop_name'] }}</div>
            <p>Owner: {{ $data['artisan']['name'] }}</p>
            <p>Email: {{ $data['artisan']['email'] }}</p>
            <p>Account: {{ $data['artisan']['payout_method'] ?: 'GCash' }} • {{ $data['artisan']['payout_account_number'] ?: 'No linked account' }}</p>
        </div>
        <div class="info-card">
            <h3>Statement Details</h3>
            <p><strong>Period:</strong> {{ $data['period']['start_date'] }} to {{ $data['period']['end_date'] }}</p>
            <p><strong>Generated At:</strong> {{ now()->format('M d, Y h:i A') }}</p>
            <p><strong>Completed Orders:</strong> {{ $data['summary']['orders_count'] }} orders</p>
            <p><strong>Status:</strong> Verified Reconciliation</p>
        </div>
    </div>

    <div class="summary-grid">
        <div class="summary-box">
            <h4>Gross Sales (GMV)</h4>
            <div class="amount">₱{{ number_format($data['summary']['gross_sales'], 2) }}</div>
        </div>
        <div class="summary-box">
            <h4>Net Earnings</h4>
            <div class="amount">₱{{ number_format($data['summary']['net_earnings'], 2) }}</div>
        </div>
        <div class="summary-box">
            <h4>Supply &amp; Payroll</h4>
            <div class="amount">₱{{ number_format($data['summary']['supply_expenses'] + $data['summary']['payroll_expenses'], 2) }}</div>
        </div>
        <div class="summary-box highlight">
            <h4>Period Net Balance</h4>
            <div class="amount">₱{{ number_format($data['summary']['period_net_balance'], 2) }}</div>
        </div>
    </div>

    <div class="section-title">Completed Orders ({{ count($data['orders']) }})</div>
    <table class="table">
        <thead>
            <tr>
                <th>Order #</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment</th>
                <th class="right">Gross</th>
                <th class="right">Courier</th>
                <th class="right">Platform</th>
                <th class="right">Net</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['orders'] as $order)
                <tr>
                    <td style="font-family: monospace; font-weight: 700;">#{{ $order['order_number'] }}</td>
                    <td>{{ $order['date'] }}</td>
                    <td>{{ $order['customer_name'] }}</td>
                    <td>{{ $order['payment_method'] }}</td>
                    <td class="right">₱{{ number_format($order['merchandise_subtotal'], 2) }}</td>
                    <td class="right">₱{{ number_format($order['shipping_fee'], 2) }}</td>
                    <td class="right">₱{{ number_format($order['platform_fee'], 2) }}</td>
                    <td class="right" style="font-weight: 700; color: #15803d;">₱{{ number_format($order['seller_net'], 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="8" class="no-data">No completed orders during this billing cycle.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="section-title">Disbursed Payouts ({{ count($data['payouts']) }})</div>
    <table class="table">
        <thead>
            <tr>
                <th>Reference #</th>
                <th>Date</th>
                <th>Destination</th>
                <th>Account</th>
                <th class="right">Amount Disbursed</th>
            </tr>
        </thead>
        <tbody>
            @forelse($data['payouts'] as $payout)
                <tr>
                    <td style="font-family: monospace; font-weight: 700;">{{ $payout['reference_number'] }}</td>
                    <td>{{ $payout['date'] }}</td>
                    <td>{{ $payout['payout_method'] }}</td>
                    <td>{{ $payout['account_name'] }} ({{ $payout['account_number'] }})</td>
                    <td class="right" style="font-weight: 700; color: #844d2d;">₱{{ number_format($payout['amount'], 2) }}</td>
                </tr>
            @empty
                <tr>
                    <td colspan="5" class="no-data">No disbursements logged during this statement period.</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        LikhangKamay Artisan Marketplace • Official Financial Statement • Automated Escrow &amp; Settlement System
    </div>
</body>
</html>
