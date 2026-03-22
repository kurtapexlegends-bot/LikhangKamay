<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background: #f9fafb;
        }
        .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            text-align: center;
        }
        .icon-circle {
            width: 80px;
            height: 80px;
            background: linear-gradient(135deg, #b45309, #92400e);
            border-radius: 16px;
            margin: 0 auto 16px;
            color: white;
            font-size: 32px;
            font-weight: bold;
            line-height: 80px;
        }
        .logo {
            font-size: 28px;
            font-weight: bold;
            color: #b45309;
        }
        .button {
            display: inline-block;
            background: #b45309;
            color: white !important;
            padding: 14px 32px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: bold;
            font-size: 14px;
            margin: 24px 0;
        }
        .warning {
            background: #fef3c7;
            border-radius: 8px;
            padding: 12px;
            margin: 20px 0;
            font-size: 12px;
            color: #92400e;
        }
        .footer {
            text-align: center;
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #9ca3af;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">LK</div>
        <div class="logo">LikhangKamay</div>
        <h1 style="font-size: 24px; color: #1f2937; margin-top: 16px;">Verify Your Email</h1>

        <p style="color: #6b7280;">
            Welcome to LikhangKamay. Please click the button below to verify your email address and activate your account.
        </p>

        <a href="{{ $url }}" class="button">Verify Email Address</a>

        <div class="warning">
            This verification link expires in <strong>60 minutes</strong>. If you did not create an account with LikhangKamay, you can safely ignore this email.
        </div>

        <p style="font-size: 12px; color: #9ca3af;">
            If the button does not work, copy and paste this secure verification link into your browser:<br>
            <a href="{{ $url }}" style="color: #b45309; word-break: break-all;">{{ $url }}</a>
        </p>

        <div class="footer">
            <p>Thank you for joining LikhangKamay.</p>
            <p>Supporting Filipino artisans and handcrafted goods.</p>
            <p style="margin-top: 16px;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
