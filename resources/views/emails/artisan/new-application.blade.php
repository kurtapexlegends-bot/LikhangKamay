<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #fef3c7; }
        .container { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 2px solid #fcd34d; text-align: center; }
        .logo { font-size: 28px; font-weight: bold; color: #b45309; margin-bottom: 8px; }
        .icon-circle { width: 80px; height: 80px; background: linear-gradient(135deg, #f59e0b, #d97706); border-radius: 50%; margin: 0 auto 16px; }
        .icon-circle span { font-size: 40px; line-height: 80px; }
        .button { display: inline-block; background: #b45309; color: white !important; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: bold; font-size: 14px; margin: 24px 0; }
        .footer { margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; }
        .info-box { background: #fffbeb; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: left; }
        .info-title { font-weight: bold; color: #d97706; margin-bottom: 16px; font-size: 16px; }
        .detail-row { padding: 10px 0; border-bottom: 1px solid #fef3c7; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: 600; color: #6b7280; font-size: 14px; }
        .detail-value { color: #111827; font-size: 14px; font-weight: 500; float: right; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon-circle">
            <span>📋</span>
        </div>
        <div class="logo">🏺 LikhangKamay</div>
        <h1 style="font-size: 24px; color: #d97706; margin-top: 16px;">New Artisan Application</h1>
        
        <p style="color: #6b7280; font-size: 14px;">A new artisan has submitted their seller application and is waiting for your review.</p>

        <div class="info-box">
            <div class="info-title">📝 Applicant Details</div>
            
            <div class="detail-row">
                <span class="detail-label">Name</span>
                <span class="detail-value">{{ $artisan->name }}</span>
                <div style="clear: both;"></div>
            </div>
            <div class="detail-row">
                <span class="detail-label">Email</span>
                <span class="detail-value">{{ $artisan->email }}</span>
                <div style="clear: both;"></div>
            </div>
            <div class="detail-row">
                <span class="detail-label">Shop Name</span>
                <span class="detail-value">{{ $artisan->shop_name }}</span>
                <div style="clear: both;"></div>
            </div>
            <div class="detail-row">
                <span class="detail-label">Phone</span>
                <span class="detail-value">{{ $artisan->phone_number }}</span>
                <div style="clear: both;"></div>
            </div>
            <div class="detail-row">
                <span class="detail-label">Location</span>
                <span class="detail-value">{{ $artisan->city }}</span>
                <div style="clear: both;"></div>
            </div>
            <div class="detail-row">
                <span class="detail-label">Submitted</span>
                <span class="detail-value">{{ $artisan->setup_completed_at->format('M d, Y h:i A') }}</span>
                <div style="clear: both;"></div>
            </div>
        </div>

        <a href="{{ url('/admin/artisans/pending') }}" class="button">📋 Review Applications</a>

        <div class="footer">
            <p>LikhangKamay Admin Notification</p>
            <p>This is an automated message.</p>
        </div>
    </div>
</body>
</html>
