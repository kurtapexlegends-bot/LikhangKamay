<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Account Status Update</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 24px; text-align: center;">
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
        </div>
        <div style="padding: 40px 32px; text-align: left;">
            @if($actionType === 'warning')
                <h1 style="font-family: Georgia, Times, serif; font-size: 20px; font-weight: normal; color: #9A3412; margin-top: 0; margin-bottom: 16px;">Policy Warning Notice</h1>
                <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #5C524A;">
                    Hello {{ $user->name }}, this is a formal notice regarding an issue identified on your LikhangKamay account.
                </p>
                <div style="background-color: #FFF7ED; border-left: 3px solid #EA580C; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #7C2D12;">
                    <strong>Reason for Warning:</strong><br>
                    {{ $reason }}
                </div>
                <p style="font-size: 13px; color: #5C524A;">
                    Your account remains active. Please review our marketplace guidelines to ensure compliance. Repeated policy violations may result in a temporary account suspension.
                </p>

            @elseif($actionType === 'suspension')
                <h1 style="font-family: Georgia, Times, serif; font-size: 20px; font-weight: normal; color: #B91C1C; margin-top: 0; margin-bottom: 16px;">Temporary Account Suspension</h1>
                <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #5C524A;">
                    Hello {{ $user->name }}, your LikhangKamay account has been temporarily suspended for <strong>{{ $days }} days</strong> until <strong>{{ $until ? $until->format('F d, Y \a\t h:i A') : 'further notice' }}</strong>.
                </p>
                <div style="background-color: #FEF2F2; border-left: 3px solid #DC2626; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #991B1B;">
                    <strong>Reason for Suspension:</strong><br>
                    {{ $reason }}
                </div>
                <p style="font-size: 13px; color: #5C524A;">
                    @if($user->isArtisan())
                        During this period, your store listings are hidden from marketplace search. You may still log in to fulfill and ship any existing open orders.
                    @elseif($user->isBuyer())
                        During this period, checkout and new review submissions are paused. You may still view your past orders and tracking numbers.
                    @else
                        Your shop module and clock-in access are paused until the suspension period ends.
                    @endif
                </p>

            @elseif($actionType === 'ban')
                <h1 style="font-family: Georgia, Times, serif; font-size: 20px; font-weight: normal; color: #7F1D1D; margin-top: 0; margin-bottom: 16px;">Account Deactivation Notice</h1>
                <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #5C524A;">
                    Hello {{ $user->name }}, your LikhangKamay account has been permanently deactivated due to serious or repeated policy violations.
                </p>
                <div style="background-color: #FEF2F2; border-left: 3px solid #991B1B; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #991B1B;">
                    <strong>Reason:</strong><br>
                    {{ $reason }}
                </div>
                <p style="font-size: 13px; color: #5C524A;">
                    All associated active listings have been delisted. If you believe this action was taken in error, please contact platform support.
                </p>

            @elseif($actionType === 'lift_suspension' || $actionType === 'unban')
                <h1 style="font-family: Georgia, Times, serif; font-size: 20px; font-weight: normal; color: #166534; margin-top: 0; margin-bottom: 16px;">Account Access Restored</h1>
                <p style="margin-top: 0; margin-bottom: 16px; font-size: 14px; color: #5C524A;">
                    Hello {{ $user->name }}, your LikhangKamay account access has been fully reinstated.
                </p>
                <div style="background-color: #F0FDF4; border-left: 3px solid #16A34A; padding: 16px; margin: 20px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #166534;">
                    <strong>Note:</strong><br>
                    {{ $reason }}
                </div>
                <p style="font-size: 13px; color: #5C524A;">
                    You can now use all standard platform features. Thank you for being a part of our artisan community.
                </p>
            @endif
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 24px; text-align: center; font-size: 12px; color: #8C827A;">
            <p style="margin: 0 0 8px;">LikhangKamay Platform Compliance & Safety</p>
            <p style="margin: 0;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
