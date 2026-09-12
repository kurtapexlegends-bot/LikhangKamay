<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Received - LikhangKamay</title>
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
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 8px; text-align: center;">Application Received!</h1>
            <div style="text-align: center;">
                <span style="display: inline-block; background-color: #FEF3C7; border: 1px solid #FDE68A; color: #92400E; padding: 6px 14px; border-radius: 20px; font-size: 13px; font-weight: 600; margin: 12px 0 24px;">Verification in Progress</span>
            </div>

            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Hello <strong>{{ $user->name ?: ($userName ?? 'Artisan Partner') }}</strong>,</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; line-height: 1.6;">Thank you for applying to open <strong>{{ $user->shop_name ?: ($shopName ?? 'your artisan studio') }}</strong> on LikhangKamay. We're excited about the prospect of showcasing your handcrafted creations to conscious buyers across Cavite.</p>

            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-radius: 8px; padding: 24px; margin: 24px 0;">
                <div style="font-family: Georgia, Times, serif; font-size: 16px; font-weight: bold; color: #A2582F; margin-bottom: 12px;">What Happens Next?</div>
                <ol style="margin: 0; padding-left: 20px; color: #5C524A; font-size: 14px; line-height: 1.6;">
                    <li style="margin-bottom: 8px;"><strong>Document Verification:</strong> Our administrative curation team reviews your submitted IDs and studio credentials to ensure marketplace authenticity.</li>
                    <li style="margin-bottom: 8px;"><strong>Review Window:</strong> Most applications are evaluated within <strong>24 to 48 hours</strong>.</li>
                    <li style="margin-bottom: 8px;"><strong>Instant Notification:</strong> You will receive an immediate email update as soon as your store is approved or if revisions are requested.</li>
                    <li><strong>Prepare Your Inventory:</strong> While you wait, prepare your product photos, descriptions, and batch inventory.</li>
                </ol>
            </div>

            <div style="text-align: center; margin: 32px 0 16px;">
                <a href="{{ route('artisan.pending') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-align: center;">Track Application Status</a>
            </div>

            <p style="font-size: 13px; color: #8C827A; text-align: center; margin-top: 16px;">
                Need to update your submitted documents? You can modify your information anytime by logging into your account.
            </p>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">LikhangKamay Marketplace Curation Team</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Empowering local Cavite artisans through digital commerce.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
