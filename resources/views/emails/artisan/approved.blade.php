<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f0fdf4; }
        .container { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 2px solid #86efac; text-align: center; }
        .logo { font-size: 28px; font-weight: bold; color: #b45309; }
        .icon-circle { width: 80px; height: 80px; background: linear-gradient(135deg, #22c55e, #16a34a); border-radius: 50%; margin: 0 auto 16px; }
        .icon-circle span { font-size: 40px; line-height: 80px; color: white; }
        .button { display: inline-block; background: #b45309; color: white !important; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; margin: 24px 0; }
        .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
        .highlight { background: #f0fdf4; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: left; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <span>✓</span>
        </div>
        <div class="logo">🏺 LikhangKamay</div>
        <h1 style="font-size: 24px; color: #16a34a; margin-top: 16px;">Congratulations! You're Approved! 🎉</h1>

        <p>Hi <strong>{{ $artisan->name }}</strong>,</p>

        <p>Great news! Your seller account for <strong>{{ $artisan->shop_name }}</strong> has been verified and approved by our team.</p>

        <div class="highlight">
            <p style="margin: 0; font-weight: bold; color: #16a34a;">🎊 What's Next?</p>
            <ul style="margin: 12px 0 0 0; padding-left: 20px;">
                <li>Access your Seller Dashboard</li>
                <li>Add your first products</li>
                <li>Start receiving orders from buyers</li>
                <li>Manage your business with our ERP tools</li>
            </ul>
        </div>

        <a href="{{ url('/dashboard') }}" class="button">🚀 Go to Dashboard</a>

        <p style="font-size: 14px; color: #6b7280;">Welcome to the LikhangKamay family! We're excited to have you as one of our valued artisan sellers.</p>

        <div class="footer">
            <p>Thank you for choosing LikhangKamay! 🇵🇭</p>
            <p>Supporting Filipino artisans and handcrafted goods.</p>
        </div>
    </div>
</body>
</html>
