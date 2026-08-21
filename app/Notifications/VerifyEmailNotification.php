<?php

namespace App\Notifications;

use App\Models\EmailTemplate;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Carbon;

class VerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected string $code,
        protected Carbon $expiresAt
    )
    {
        $this->afterCommit();
    }

    public function via($notifiable): array
    {
        return ['mail'];
    }

    public function toMail($notifiable): MailMessage
    {
        $template = rescue(fn () => EmailTemplate::where('slug', 'verify_email')->first(), null, false);
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
