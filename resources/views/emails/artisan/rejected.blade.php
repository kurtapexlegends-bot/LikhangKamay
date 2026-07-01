<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Application Needs Attention</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 28px; text-align: center;">
            <a href="#" style="font-family: Georgia, Times, serif; font-size: 26px; font-weight: bold; color: #A2582F; text-decoration: none; letter-spacing: -0.5px;">LikhangKamay</a>
        </div>
        <div style="padding: 40px 32px; text-align: center;">
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #C2783F; margin-top: 0; margin-bottom: 20px;">Application Needs Attention</h1>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; text-align: left;">Hi <strong>{{ $artisan->name }}</strong>,</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; text-align: left;">Thank you for applying to become a seller on LikhangKamay. Unfortunately, we could not approve your application at this time.</p>

            <div style="background-color: #FFFDFB; border: 1px solid #E7E1D8; border-left: 4px solid #C2783F; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: left;">
                <div style="font-family: Georgia, Times, serif; font-weight: bold; color: #A2582F; margin-bottom: 8px; font-size: 15px;">Review Feedback</div>
                <p style="margin: 0; color: #5C524A; font-size: 14px; line-height: 1.5;">{{ $artisan->artisan_rejection_reason }}</p>
            </div>

            <p style="font-size: 15px; color: #5C524A; text-align: left;">
                <strong>Don't worry!</strong> You can update your application and resubmit. Please address the feedback mentioned above and try again.
            </p>

            <a href="{{ url('/artisan/setup') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin: 20px 0; text-align: center;">Update & Resubmit</a>

            <p style="font-size: 14px; color: #8C827A; margin-top: 24px;">
                If you have questions or need assistance, please contact our support team.
            </p>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Thank you for your interest in LikhangKamay!</p>
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Supporting Filipino artisans and handcrafted goods.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
