<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Earnings Payout Disbursed</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 24px; text-align: center;">
            <a href="{{ url('/') }}" style="text-decoration: none; display: inline-block; vertical-align: middle;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: collapse;">
                    <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                            <img src="https://files.catbox.moe/e56ajg.png" alt="LikhangKamay Logo" style="height: 38px; width: 38px; display: block; border: 0; outline: none; text-decoration: none;">
                        </td>
                        <td style="vertical-align: middle; text-align: left;">
                            <span style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: bold; color: #2E2520; display: block; line-height: 1; letter-spacing: -0.5px;">LikhangKamay</span>
                        </td>
                    </tr>
                </table>
            </a>
        </div>

        <div style="padding: 40px 32px; text-align: center;">
            <div style="display: inline-block; background-color: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 50%; width: 56px; height: 56px; line-height: 56px; text-align: center; margin-bottom: 20px;">
                <span style="font-size: 24px; color: #059669;">✓</span>
            </div>

            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 12px;">Your Payout Has Been Sent!</h1>
            <p style="margin-top: 0; margin-bottom: 24px; font-size: 15px; color: #5C524A; text-align: left;">Hi <strong>{{ $artisan->name }}</strong>,</p>
            <p style="margin-top: 0; margin-bottom: 24px; font-size: 15px; color: #5C524A; text-align: left;">We're happy to let you know that your shop earnings for <strong>{{ $artisan->shop_name }}</strong> have been transferred to your payout account.</p>

            <!-- Payout Summary Card -->
            <div style="background-color: #F7F4F0; border: 1px solid #E7E1D8; border-radius: 12px; padding: 24px; margin: 24px 0; text-align: left;">
                <table border="0" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="padding-bottom: 12px; font-size: 13px; color: #8C827A; text-transform: uppercase; font-weight: bold; letter-spacing: 0.5px;">Amount Transferred</td>
                        <td style="padding-bottom: 12px; font-size: 20px; color: #059669; font-weight: bold; text-align: right;">₱{{ number_format($payout->amount, 2) }}</td>
                    </tr>
                    <tr>
                        <td style="padding-top: 8px; padding-bottom: 8px; border-top: 1px solid #E7E1D8; font-size: 14px; color: #5C524A;">Payout Method</td>
                        <td style="padding-top: 8px; padding-bottom: 8px; border-top: 1px solid #E7E1D8; font-size: 14px; color: #2E2520; font-weight: bold; text-align: right;">{{ $payout->payout_method }}</td>
                    </tr>
                    <tr>
                        <td style="padding-top: 8px; padding-bottom: 8px; font-size: 14px; color: #5C524A;">Account Name</td>
                        <td style="padding-top: 8px; padding-bottom: 8px; font-size: 14px; color: #2E2520; font-weight: bold; text-align: right;">{{ $payout->payout_account_name }}</td>
                    </tr>
                    <tr>
                        <td style="padding-top: 8px; padding-bottom: 8px; font-size: 14px; color: #5C524A;">Account Number</td>
                        <td style="padding-top: 8px; padding-bottom: 8px; font-size: 14px; font-family: monospace; color: #2E2520; font-weight: bold; text-align: right;">{{ $payout->payout_account_number }}</td>
                    </tr>
                    @if($payout->reference_number)
                    <tr>
                        <td style="padding-top: 8px; padding-bottom: 8px; font-size: 14px; color: #5C524A;">Transaction Reference No.</td>
                        <td style="padding-top: 8px; padding-bottom: 8px; font-size: 14px; font-family: monospace; color: #2E2520; font-weight: bold; text-align: right;">{{ $payout->reference_number }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding-top: 8px; font-size: 14px; color: #5C524A;">Disbursement Date</td>
                        <td style="padding-top: 8px; font-size: 14px; color: #2E2520; text-align: right;">{{ $payout->created_at->format('M d, Y h:i A') }}</td>
                    </tr>
                </table>
            </div>

            <a href="{{ url('/seller/accounting?tab=history') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin: 16px 0; text-align: center;">View Shop Earnings &amp; Ledger</a>

            <p style="font-size: 13px; color: #8C827A; margin-top: 24px; line-height: 1.5;">
                If you have questions about this transfer or notice an issue with your account, please contact LikhangKamay support through your seller portal.
            </p>
        </div>

        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Thank you for crafting with LikhangKamay!</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Supporting Filipino artisans and local craftsmanship.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
