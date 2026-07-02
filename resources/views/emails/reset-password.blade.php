<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 24px; text-align: center;">
            <a href="#" style="text-decoration: none; display: inline-block;">
                <img src="{{ $message->embed(public_path('images/logo.png')) }}" alt="LikhangKamay" style="height: 44px; display: block; border: 0; outline: none; text-decoration: none; margin: 0 auto;">
            </a>
        </div>
        <div style="padding: 40px 32px; text-align: center;">
            <h1 style="font-family: Georgia, Times, serif; font-size: 22px; font-weight: normal; color: #2E2520; margin-top: 0; margin-bottom: 20px;">Reset Your Password</h1>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">
                You requested to reset your password. Click the button below to create a new password.
            </p>

            <a href="{{ $url }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin: 24px 0; text-align: center;">Reset Password</a>

            <div style="background-color: #F7F4F0; border-left: 3px solid #C2783F; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #7C6D62; text-align: left; line-height: 1.5;">
                This link will expire in <strong>60 minutes</strong>. If you did not request a password reset, you can safely ignore this email.
            </div>

            <p style="font-size: 12px; color: #8C827A; margin-top: 24px; line-height: 1.4; word-break: break-all;">
                If the button above does not work, copy and paste this link into your browser:<br>
                <a href="{{ $url }}" style="color: #C2783F; text-decoration: underline;">{{ $url }}</a>
            </p>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">LikhangKamay Security Team</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Supporting Filipino artisans and handcrafted goods.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
