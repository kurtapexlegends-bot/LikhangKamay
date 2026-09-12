<?php

namespace App\Notifications;

use App\Models\EmailTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class VerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public string $code;
    public Carbon $expiresAt;

    public function __construct(string $code, Carbon $expiresAt)
    {
        $this->code = $code;
        $this->expiresAt = $expiresAt;
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $template = rescue(fn () => Cache::remember('email_template_verify_email', 3600, fn () => EmailTemplate::where('slug', 'verify_email')->first()), null, false);
        $isActive = $template && (bool) $template->is_active;

        $subject = ($template && $isActive && !empty($template->subject))
            ? strtr($template->subject, ['{verification_code}' => $this->code, '{site_name}' => 'LikhangKamay']) 
            : 'Verify Your Email - LikhangKamay';

        return (new MailMessage)
            ->subject($subject)
            ->view('emails.verify-email', [
                'code' => $this->code,
                'expiresAt' => $this->expiresAt,
                'expiresInMinutes' => max(1, now()->diffInMinutes($this->expiresAt, false)),
            ]);
    }
}
