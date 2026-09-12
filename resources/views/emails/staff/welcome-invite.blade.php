<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to the Team - LikhangKamay</title>
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
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 8px; text-align: center;">Welcome to the Team!</h1>
            <div style="text-align: center;">
                <span style="display: inline-block; background-color: #F0FDF4; border: 1px solid #BBF7D0; color: #15803D; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 12px 0 24px;">Workspace Staff Account</span>
            </div>

            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Hello <strong>{{ $staffUser->name ?: ($userName ?? 'Studio Team Member') }}</strong>,</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">
                You have been invited to join the studio team for <strong>{{ $shopName ?? 'Artisan Studio' }}</strong> on LikhangKamay as <strong>{{ $employeeRole ?? 'Staff Member' }}</strong>.
            </p>

            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 16px; font-weight: bold; color: #2E2520; border-bottom: 1px solid #E7E1D8; padding-bottom: 12px; margin-bottom: 16px;">
                    Your Login Credentials
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #5C524A;">
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Sign-In Email:</td>
                        <td align="right" style="padding: 8px 0; font-weight: bold; color: #2E2520; border-bottom: 1px dashed #E7E1D8;">{{ $staffUser->email }}</td>
                    </tr>
                    @if(!empty($temporaryPassword))
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Temporary Password:</td>
                        <td align="right" style="padding: 8px 0; font-family: monospace; font-size: 14px; font-weight: bold; color: #A2582F; border-bottom: 1px dashed #E7E1D8;">{{ $temporaryPassword }}</td>
                    </tr>
                    @endif
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Assigned Studio:</td>
                        <td align="right" style="padding: 8px 0; font-weight: 600; color: #2E2520; border-bottom: 1px dashed #E7E1D8;">{{ $shopName ?? 'Artisan Studio' }}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 0; border-bottom: 1px dashed #E7E1D8;">Role:</td>
                        <td align="right" style="padding: 8px 0; color: #15803D; font-weight: bold; border-bottom: 1px dashed #E7E1D8;">{{ $employeeRole ?? 'Staff' }}</td>
                    </tr>
                </table>

                <div style="margin-top: 16px; padding: 12px; background-color: #FEF3C7; border: 1px solid #FDE68A; border-radius: 6px; font-size: 12px; color: #92400E; line-height: 1.5;">
                    <strong>Security Notice:</strong> For your security, you will be prompted to change your password immediately upon your first sign in.
                </div>
            </div>

            <div style="text-align: center; margin: 32px 0 16px;">
                <a href="{{ $loginUrl ?? url('/login') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-align: center;">Sign In to Staff Workspace</a>
            </div>

            <p style="font-size: 13px; color: #8C827A; text-align: center; margin-top: 16px;">
                Once signed in, you can clock in for shifts, message your team, and access your assigned workspace modules.
            </p>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">LikhangKamay Team & Staff Operations</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Connecting artisan teams across the Province of Cavite.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
