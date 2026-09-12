<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Subscription Billing Receipt - LikhangKamay</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 24px; text-align: center;">
            <a href="{{ url('/') }}" style="text-decoration: none; display: inline-block; vertical-align: middle;">
                <table border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto; border-collapse: collapse;">
                    <tr>
                        <td style="vertical-align: middle; padding-right: 12px;">
                            <img src="https://files.catbox.moe/e56ajg.png" alt="Logo" style="height: 38px; width: 38px; display: block; border: 0; outline: none; text-decoration: none;">
                        </td>
                        <td style="vertical-align: middle; text-align: left;">
                            <span style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: bold; color: #2E2520; display: block; line-height: 1; letter-spacing: -0.5px;">LikhangKamay</span>
                        </td>
                    </tr>
                </table>
            </a>
        </div>
        <div style="padding: 40px 32px;">
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 8px; text-align: center;">Subscription Activated!</h1>
            <div style="text-align: center;">
                <span style="display: inline-block; background-color: #FEF3C7; border: 1px solid #FDE68A; color: #92400E; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 12px 0 24px;">{{ $tierLabel ?? 'Artisan Tier' }} Plan</span>
            </div>

            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Hello <strong>{{ $user->name ?: ($userName ?? 'Artisan Partner') }}</strong>,</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Thank you for your investment in growing <strong>{{ $user->shop_name ?: ($shopName ?? 'your artisan studio') }}</strong>! Your subscription payment has been processed and your workspace features are immediately active.</p>

            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 18px; font-weight: bold; color: #2E2520; border-bottom: 1px solid #E7E1D8; padding-bottom: 12px; margin-bottom: 16px;">
                    Billing & Plan Details
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #5C524A;">
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Subscribed Plan:</td>
                        <td align="right" style="padding: 8px 0; font-weight: bold; color: #A2582F; border-bottom: 1px dashed #E7E1D8;">{{ $tierLabel ?? 'Premium' }}</td>
                    </tr>
                    @if(isset($referenceNumber))
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Invoice Reference:</td>
                        <td align="right" style="padding: 8px 0; font-family: monospace; font-size: 12px; color: #5C524A; border-bottom: 1px dashed #E7E1D8;">{{ $referenceNumber }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Active Period:</td>
                        <td align="right" style="padding: 8px 0; font-size: 13px; color: #2E2520; border-bottom: 1px dashed #E7E1D8;">
                            {{ !empty($validUntil) ? (\Illuminate\Support\Carbon::parse($validUntil)->format('M d, Y')) : now()->addDays(30)->format('M d, Y') }} (30 Days)
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Payment Status:</td>
                        <td align="right" style="padding: 8px 0; color: #15803D; font-weight: bold; border-bottom: 1px dashed #E7E1D8;">Paid / Active</td>
                    </tr>
                    <tr>
                        <td style="padding-top: 16px; font-size: 16px; font-weight: bold; color: #A2582F;">Amount Paid:</td>
                        <td align="right" style="padding-top: 16px; font-size: 18px; font-weight: bold; color: #A2582F;">₱{{ number_format($amountPaid ?? 0, 2) }}</td>
                    </tr>
                </table>

                @if(!empty($perks))
                <div style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #E7E1D8;">
                    <span style="font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #8C827A; display: block; margin-bottom: 8px;">Active Privileges:</span>
                    <ul style="margin: 0; padding-left: 20px; color: #5C524A; font-size: 13px; line-height: 1.5;">
                        @foreach($perks as $perk)
                        <li>{{ $perk }}</li>
                        @endforeach
                    </ul>
                </div>
                @endif
            </div>

            <div style="text-align: center; margin: 32px 0 16px;">
                <a href="{{ route('seller.subscription') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-align: center;">Manage Subscription</a>
            </div>

            <p style="font-size: 12px; color: #8C827A; text-align: center; margin-top: 16px;">
                Your plan renews automatically unless cancelled in your billing settings. You can manage payment methods anytime from your Seller Workspace.
            </p>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">LikhangKamay Artisan Growth & Subscriptions</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Zero platform commission. 100% of product sales go to you.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
