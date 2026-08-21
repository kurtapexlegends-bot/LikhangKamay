<?php

namespace App\Notifications;

use App\Models\EmailTemplate;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ResetPasswordNotification extends Notification
{
    public string $token;

    public function __construct(string $token)
    {
        $this->token = $token;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = url(route('password.reset', [
            'token' => $this->token,
            'email' => $notifiable->getEmailForPasswordReset(),
        ], false));

        $template = rescue(fn () => EmailTemplate::where('slug', 'reset_password')->first(), null, false);
        $isActive = $template && (bool) $template->is_active;

        $subject = ($template && $isActive && !empty($template->subject))
            ? strtr($template->subject, ['{site_name}' => 'LikhangKamay']) 
            : 'Reset Your Password - LikhangKamay';

        return (new MailMessage)
            ->subject($subject)
            ->view('emails.reset-password', ['url' => $url]);
    }

    public function toArray(object $notifiable): array
    {
        return [];
    }
}
