<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $headline ?? 'LikhangKamay Notification' }}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #FDFBF9; color: #2E2520; line-height: 1.6; -webkit-text-size-adjust: none;">
    <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border: 1px solid #E7E1D8; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(46, 37, 32, 0.03);">
        <!-- Header -->
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

        <!-- Content Body -->
        <div style="padding: 40px 32px;">
            @if(!empty($headline))
                <h1 style="font-family: Georgia, Times, serif; font-size: 22px; font-weight: normal; color: #2E2520; margin-top: 0; margin-bottom: 20px; text-align: center;">{{ $headline }}</h1>
            @endif

            <div style="font-size: 15px; color: #5C524A; line-height: 1.7; white-space: pre-line;">
                {!! nl2br(e($body)) !!}
            </div>

            @if(!empty($buttonLabel) && !empty($buttonUrl))
                <div style="text-align: center; margin: 32px 0 24px;">
                    <a href="{{ $buttonUrl }}" style="display: inline-block; background-color: #8B4513; color: #ffffff; padding: 14px 28px; border-radius: 10px; font-size: 14px; font-weight: 700; text-decoration: none; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        {{ $buttonLabel }}
                    </a>
                </div>
            @endif
        </div>

        <!-- Footer -->
        <div style="background-color: #F7F4F0; border-top: 1px solid #E7E1D8; padding: 28px; text-align: center; font-size: 12px; color: #8C827A; line-height: 1.5;">
            <p style="margin: 0 0 8px; font-size: 12px; color: #8C827A;">Supporting Filipino artisans and handcrafted goods.</p>
            <p style="margin: 16px 0 0 0; font-size: 11px; color: #8C827A;">&copy; {{ date('Y') }} LikhangKamay. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
