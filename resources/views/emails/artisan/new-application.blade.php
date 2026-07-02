<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Artisan Application</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <div style="background-color: #F7F4F0; border-bottom: 1px solid #E7E1D8; padding: 24px; text-align: center;">
            <a href="#" style="text-decoration: none; display: inline-block;">
                <img src="{{ asset('images/logo.png') }}" alt="LikhangKamay" style="height: 44px; display: block; border: 0; outline: none; text-decoration: none; margin: 0 auto;">
            </a>
        </div>
        <div style="padding: 40px 32px; text-align: center;">
            <h1 style="font-family: Georgia, Times, serif; font-size: 24px; font-weight: normal; color: #A2582F; margin-top: 0; margin-bottom: 20px;">New Artisan Application</h1>
            <p style="margin-top: 0; margin-bottom: 16px; font-size: 15px; color: #5C524A;">A new artisan has submitted their seller application and is waiting for review.</p>

            <table style="width: 100%; margin: 24px auto; background-color: #FDFBF9; border: 1px solid #E7E1D8; border-radius: 8px; border-collapse: separate; border-spacing: 0;">
                <tr>
                    <td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #E7E1D8; color: #8C827A; font-weight: 600; text-align: left; width: 40%;">Name</td>
                    <td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #E7E1D8; color: #2E2520; text-align: right; font-weight: 500;">{{ $artisan->name }}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #E7E1D8; color: #8C827A; font-weight: 600; text-align: left;">Email</td>
                    <td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #E7E1D8; color: #2E2520; text-align: right; font-weight: 500;">{{ $artisan->email }}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #E7E1D8; color: #8C827A; font-weight: 600; text-align: left;">Shop Name</td>
                    <td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #E7E1D8; color: #2E2520; text-align: right; font-weight: 500;">{{ $artisan->shop_name }}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #E7E1D8; color: #8C827A; font-weight: 600; text-align: left;">Phone</td>
                    <td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #E7E1D8; color: #2E2520; text-align: right; font-weight: 500;">{{ $artisan->phone_number }}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #E7E1D8; color: #8C827A; font-weight: 600; text-align: left;">Location</td>
                    <td style="padding: 12px 16px; font-size: 14px; border-bottom: 1px solid #E7E1D8; color: #2E2520; text-align: right; font-weight: 500;">{{ $artisan->city }}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 16px; font-size: 14px; color: #8C827A; font-weight: 600; text-align: left;">Submitted At</td>
                    <td style="padding: 12px 16px; font-size: 14px; color: #2E2520; text-align: right; font-weight: 500;">{{ $artisan->setup_completed_at->format('M d, Y h:i A') }}</td>
                </tr>
            </table>

            <a href="{{ route('admin.pending') }}" style="display: inline-block; background-color: #C2783F; color: #ffffff !important; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 28px; border-radius: 8px; margin: 20px 0; text-align: center;">Review Applications</a>
        </div>
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0; font-size: 12px; color: #8C827A;">LikhangKamay Admin Notification</p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #8C827A;">This is an automated message.</p>
        </div>
    </div>
</body>
</html>
