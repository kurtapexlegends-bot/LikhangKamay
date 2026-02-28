<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #fef3c7; }
        .container { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 2px solid #fbbf24; text-align: center; }
        .logo { font-size: 28px; font-weight: bold; color: #b45309; }
        .icon-circle { width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; margin: 0 auto 16px; }
        .icon-circle span { font-size: 40px; line-height: 80px; color: white; }
        .button { display: inline-block; background: #b45309; color: white !important; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; margin: 24px 0; }
        .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
        .reason-box { background: #fef3c7; border: 1px solid #fbbf24; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <span>!</span>
        </div>
        <div class="logo">🏺 LikhangKamay</div>
        <h1 style="font-size: 24px; color: #d97706; margin-top: 16px;">Application Needs Attention</h1>

        <p>Hi <strong>{{ $artisan->name }}</strong>,</p>

        <p>Thank you for applying to become a seller on LikhangKamay. Unfortunately, we couldn't approve your application at this time.</p>

        <div class="reason-box">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #92400e;">📋 Reason:</p>
            <p style="margin: 0; color: #78350f;">{{ $artisan->artisan_rejection_reason }}</p>
        </div>

        <p style="font-size: 14px; color: #6b7280;"><strong>Don't worry!</strong> You can update your application and resubmit. Please address the issues mentioned above and try again.</p>

        <a href="{{ url('/artisan/setup') }}" class="button">📝 Update & Resubmit</a>

        <p style="font-size: 14px; color: #6b7280;">If you have questions or need assistance, please contact our support team.</p>

        <div class="footer">
            <p>Thank you for your interest in LikhangKamay! 🇵🇭</p>
            <p>Supporting Filipino artisans and handcrafted goods.</p>
        </div>
    </div>
</body>
</html>
