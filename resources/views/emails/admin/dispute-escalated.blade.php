<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>New Escalated Dispute</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 24px; text-align: center;">
            <a href="#" style="text-decoration: none; display: inline-block; vertical-align: middle;">
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
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #C2783F; margin-top: 0; margin-bottom: 20px; text-align: center;">New Escalated Dispute</h1>
            <p style="margin-top: 0; margin-bottom: 24px; font-size: 16px; color: #5C524A; line-height: 1.6;">
                A buyer has escalated a return dispute for Order <strong>#{{ $orderNumber }}</strong> for administrator arbitration.
            </p>
            <div style="background-color: #F7F4F0; border: 1px solid #E7E1D8; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; font-size: 14px; color: #5C524A; line-height: 1.5;">
                <strong style="color: #2E2520; display: block; margin-bottom: 4px;">Escalation Reason:</strong>
                {{ $reason }}
            </div>
            <div style="text-align: center; margin-top: 30px;">
                <a href="{{ route('admin.disputes.index') }}" style="display: inline-block; background-color: #A2582F; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; text-decoration: none; padding: 12px 28px; border-radius: 6px; letter-spacing: 0.5px;">Open Disputes Dashboard</a>
            </div>
        </div>
        <div style="background-color: #FDFBF9; border-top: 1px solid #E7E1D8; padding: 24px 32px; text-align: center; font-size: 12px; color: #A29790;">
            <p style="margin: 0 0 8px 0;">This is an automated message from LikhangKamay. Please do not reply to this email.</p>
            <p style="margin: 0;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
