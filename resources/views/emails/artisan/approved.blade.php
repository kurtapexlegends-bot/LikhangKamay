<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Artisan Account Approved</title>
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
        <div style="padding: 40px 32px; text-align: center;">
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 20px;">Congratulations! You're Approved!</h1>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; text-align: left;">Hi <strong>{{ $artisan->name }}</strong>,</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; text-align: left;">Great news! Your seller account for <strong>{{ $artisan->shop_name }}</strong> has been verified and approved by our team.</p>

            <div style="background-color: #F7F4F0; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: left;">
                <div style="font-family: Georgia, Times, serif; font-weight: bold; color: #A2582F; margin-bottom: 12px; font-size: 16px;">What's Next?</div>
                <ul style="margin: 0; padding-left: 20px; color: #5C524A; font-size: 14px; line-height: 1.6;">
                    <li style="margin-bottom: 8px;">Access your Seller Dashboard</li>
                    <li style="margin-bottom: 8px;">Add your first products</li>
                    <li style="margin-bottom: 8px;">Start receiving orders from buyers</li>
                    <li>Manage your business with our ERP tools</li>
                </ul>
            </div>

            <a href="{{ url('/dashboard') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin: 20px 0; text-align: center;">Go to Dashboard</a>

            <p style="font-size: 14px; color: #8C827A; margin-top: 24px;">
                Welcome to the LikhangKamay family! We're excited to support your journey as an artisan seller.
            </p>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Thank you for choosing LikhangKamay!</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Supporting Filipino artisans and handcrafted goods.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
