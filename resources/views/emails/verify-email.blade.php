<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 28px; text-align: center;">
            <a href="#" style="font-family: Georgia, Times, serif; font-size: 26px; font-weight: bold; color: #A2582F; text-decoration: none; letter-spacing: -0.5px;">LikhangKamay</a>
        </div>
        <div style="padding: 40px 32px; text-align: center;">
            <h1 style="font-family: Georgia, Times, serif; font-size: 22px; font-weight: normal; color: #2E2520; margin-top: 0; margin-bottom: 20px;">Verify Your Email Address</h1>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">
                Welcome to LikhangKamay. Please enter the verification code below in the application to verify your email address and activate your account.
            </p>

            <div style="display: inline-block; background-color: #F7F4F0; color: #2E2520; padding: 16px 28px; border-radius: 10px; letter-spacing: 0.35em; font-size: 28px; font-weight: 700; margin: 24px 0; border: 1px solid #E7E1D8; font-family: Courier, monospace;">{{ $code }}</div>

            <div style="background-color: #F7F4F0; border-left: 3px solid #C2783F; padding: 16px; margin: 24px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #7C6D62; text-align: left; line-height: 1.5;">
                This verification code will expire in <strong>{{ max(1, $expiresInMinutes) }} minutes</strong>. If you did not create an account with LikhangKamay, you can safely ignore this email.
            </div>

            <p style="font-size: 12px; color: #8C827A; margin-top: 24px; line-height: 1.4;">
                For security, enter the code directly on the LikhangKamay verification page while signed in to your account.
            </p>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Thank you for joining LikhangKamay.</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Supporting Filipino artisans and handcrafted goods.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
