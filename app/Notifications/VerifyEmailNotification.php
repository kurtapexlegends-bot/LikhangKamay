<?php

namespace App\Notifications;

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

    /**
     * Get the notification's delivery channels.
     */
    public function via($notifiable): array
    {
        return ['mail'];
    }

    /**
     * Get the mail representation of the notification.
     */
    public function toMail($notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Verify Your Email - LikhangKamay')
            ->view('emails.verify-email', [
                'code' => $this->code,
                'expiresAt' => $this->expiresAt,
                'expiresInMinutes' => now()->diffInMinutes($this->expiresAt, false),
            ]);
    }
}
