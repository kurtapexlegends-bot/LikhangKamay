<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Review Reminder</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 24px; text-align: center;">
            <a href="#" style="text-decoration: none; display: inline-block;">
                <img src="https://files.catbox.moe/e56ajg.png" alt="LikhangKamay" style="height: 44px; display: block; border: 0; outline: none; text-decoration: none; margin: 0 auto;">
            </a>
        </div>
        <div style="padding: 40px 32px; text-align: center;">
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 20px;">Share Your Feedback</h1>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; text-align: left;">Hi <strong>{{ $order->customer_name }}</strong>,</p>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A; text-align: left; line-height: 1.6;">
                Thank you for supporting our local artisans! Your order <strong>#{{ $order->order_number }}</strong> was completed recently.
            </p>
            <p style="margin-top: 0; margin-bottom: 24px; font-size: 15px; color: #5C524A; text-align: left; line-height: 1.6;">
                We would love to hear about your experience. Your feedback is extremely valuable and helps our artisans grow and improve their crafts.
            </p>

            <a href="{{ $url }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin: 12px 0; text-align: center;">Write a Review</a>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0;">Thank you for being part of the LikhangKamay community!</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
