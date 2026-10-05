<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Disbursement Voucher - #{{ $payout->id }} - {{ $artisan->shop_name ?? $artisan->name }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.5;
            color: #1c1917;
            max-width: 820px;
            margin: 0 auto;
            padding: 32px 28px;
            background: white;
        }
        .header { text-align: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 2px solid #e7d8c9; position: relative; }
        .logo { font-size: 24px; font-weight: 900; color: #844d2d; letter-spacing: -0.02em; }
        .voucher-title { font-size: 11px; font-weight: 800; color: #78716c; text-transform: uppercase; letter-spacing: 0.12em; margin-top: 4px; }
        .voucher-badge { display: inline-block; background: #292524; color: #f5f5f4; font-size: 10px; font-weight: 800; padding: 3px 10px; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 6px; }

        .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
        .info-card { padding: 14px; background: #fafaf9; border: 1px solid #e7e5e4; border-radius: 10px; font-size: 12px; }
        .info-card h3 { font-size: 10px; font-weight: 800; color: #78716c; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
        .party-name { font-size: 14px; font-weight: 800; color: #1c1917; margin-bottom: 2px; }

        .details-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
        .details-table th { background: #fafaf9; padding: 10px 14px; text-align: left; font-size: 10px; font-weight: 800; color: #78716c; text-transform: uppercase; border-bottom: 1px solid #e7e5e4; }
        .details-table td { padding: 12px 14px; border-bottom: 1px dashed #e7e5e4; color: #292524; font-weight: 500; }
        .details-table .label-col { font-weight: 700; color: #57534e; width: 35%; }
        .details-table .value-col { font-weight: 600; color: #1c1917; }

        .amount-card { background: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 28px; }
        .amount-label { font-size: 11px; font-weight: 800; color: #166534; text-transform: uppercase; letter-spacing: 0.08em; }
        .amount-value { font-size: 22px; font-weight: 900; color: #15803d; font-family: monospace; }

        .auth-block { margin-top: 24px; padding: 16px; border: 1px solid #e7e5e4; border-radius: 10px; background: #fafaf9; font-size: 11px; color: #57534e; }
        .auth-block h4 { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #78716c; margin-bottom: 4px; }

        .footer { text-align: center; margin-top: 36px; padding-top: 14px; border-top: 1px solid #e7e5e4; font-size: 10px; color: #a8a29e; font-weight: 500; }

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
            body { padding: 15px; max-width: 100%; }
            .no-print { display: none !important; }
        }
    </style>
    @if(request()->boolean('download') || request()->boolean('print') || request()->boolean('auto_print'))
        <script>
            window.addEventListener('load', function () {
                window.print();
            });
        </script>
    @endif
</head>
<body>
    <div class="header">
        <button class="print-btn no-print" onclick="window.print()">Print / Save PDF</button>
        <div class="logo">LikhangKamay</div>
        <div class="voucher-title">Official Payout Disbursement Voucher</div>
        <div class="voucher-badge">Disbursement ID #{{ str_pad($payout->id, 6, '0', STR_PAD_LEFT) }}</div>
    </div>

    <div class="parties-grid">
        <div class="info-card">
            <h3>Disbursing Platform Entity</h3>
            <p class="party-name">LikhangKamay Marketplace</p>
            <p>Escrow & Treasury Settlement Division</p>
            <p>support@likhangkamay.com</p>
            <p style="margin-top: 6px; font-size: 11px; color: #78716c;">
                <strong>Date Released:</strong> {{ $payout->created_at->format('M d, Y - h:i A') }}
            </p>
        </div>

        <div class="info-card">
            <h3>Beneficiary Artisan Shop</h3>
            <p class="party-name">{{ $artisan->shop_name ?: $artisan->name }}</p>
            <p>Owner: {{ $artisan->name }}</p>
            <p>Email: {{ $artisan->email }}</p>
            @if($artisan->phone_number)
                <p>Phone: {{ $artisan->phone_number }}</p>
            @endif
        </div>
    </div>

    <table class="details-table">
        <thead>
            <tr>
                <th colspan="2">Disbursement & Settlement Details</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td class="label-col">Payout Channel / Method</td>
                <td class="value-col">
                    <strong>{{ $payout->payout_method }}</strong>
                </td>
            </tr>
            <tr>
                <td class="label-col">Registered Account Name</td>
                <td class="value-col">{{ $payout->payout_account_name ?: 'Registered Merchant Name' }}</td>
            </tr>
            <tr>
                <td class="label-col">Destination Account Number</td>
                <td class="value-col" style="font-family: monospace;">
                    {{ $payout->payout_account_number }}
                </td>
            </tr>
            <tr>
                <td class="label-col">Gateway / Bank Reference Number</td>
                <td class="value-col" style="font-family: monospace; font-weight: 800; color: #1c1917;">
                    {{ $payout->reference_number ?: 'SYSTEM-ESCROW-RELEASE' }}
                </td>
            </tr>
            <tr>
                <td class="label-col">Settlement Status</td>
                <td class="value-col">
                    <span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 800; background: #dcfce7; color: #15803d; text-transform: uppercase;">
                        {{ $payout->status ?: 'Completed' }}
                    </span>
                </td>
            </tr>
        </tbody>
    </table>

    <div class="amount-card">
        <div>
            <div class="amount-label">Net Disbursed Amount</div>
            <div style="font-size: 11px; color: #166534; font-weight: 500; margin-top: 2px;">
                Direct settlement released from platform escrow ledger
            </div>
        </div>
        <div class="amount-value">₱{{ number_format((float) $payout->amount, 2) }}</div>
    </div>

    <div class="auth-block">
        <h4>Electronic Audit Verification</h4>
        <p>This disbursement voucher is an electronically generated statement of fund settlement issued by LikhangKamay. It certifies that the above net earnings have been processed and transferred to the registered payout account.</p>
        <p style="margin-top: 6px; font-size: 10px; font-family: monospace; color: #78716c;">
            VOUCHER-HASH: {{ hash('sha256', "payout-{$payout->id}-{$payout->amount}-{$payout->reference_number}-{$payout->created_at->timestamp}") }}
        </p>
    </div>

    <div class="footer">
        LikhangKamay Artisan E-Commerce Platform &bull; Supporting Filipino Craftsmanship &bull; Generated {{ now()->format('Y-m-d H:i:s') }}
    </div>
</body>
</html>
