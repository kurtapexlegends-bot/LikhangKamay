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
        .code {
            display: inline-block;
            background: #f9fafb;
            color: #111827;
            padding: 16px 28px;
            border-radius: 14px;
            letter-spacing: 0.35em;
            font-size: 28px;
            font-weight: 700;
            margin: 24px 0;
            border: 1px solid #e5e7eb;
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
            Welcome to LikhangKamay. Enter the verification code below in the app to verify your email address and activate your account.
        </p>

        <div class="code">{{ $code }}</div>

        <div class="warning">
            This verification code expires in <strong>{{ max(1, $expiresInMinutes) }} minutes</strong>. If you did not create an account with LikhangKamay, you can safely ignore this email.
        </div>

        <p style="font-size: 12px; color: #9ca3af;">
            For security, enter the code directly on the LikhangKamay verification page while signed in to your account.
        </p>

        <div class="footer">
            <p>Thank you for joining LikhangKamay.</p>
            <p>Supporting Filipino artisans and handcrafted goods.</p>
            <p style="margin-top: 16px;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
