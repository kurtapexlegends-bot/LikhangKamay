<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use DateTimeInterface;

class UserDisciplinaryNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public string $actionType, // warning, suspension, ban, lift_suspension, unban
        public string $reason,
        public ?int $days = null,
        public ?DateTimeInterface $until = null
    ) {
        $this->afterCommit();
    }

    public function via(object $notifiable): array
    {
        return ['mail', 'database'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $actionTitle = match ($this->actionType) {
            'warning' => 'Important Policy Notice - LikhangKamay',
            'suspension' => "Temporary Account Suspension ({$this->days} Days) - LikhangKamay",
            'ban' => 'Account Deactivation Notice - LikhangKamay',
            'lift_suspension' => 'Account Suspension Lifted - LikhangKamay',
            'unban' => 'Account Reinstated - LikhangKamay',
            default => 'Account Status Update - LikhangKamay',
        };

        return (new MailMessage)
            ->subject($actionTitle)
            ->view('emails.user-disciplinary', [
                'user' => $notifiable,
                'actionType' => $this->actionType,
                'reason' => $this->reason,
                'days' => $this->days,
                'until' => $this->until,
            ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'disciplinary_action',
            'action_type' => $this->actionType,
            'reason' => $this->reason,
            'days' => $this->days,
            'until' => $this->until?->format('Y-m-d H:i:s'),
            'created_at' => now()->toIso8601String(),
        ];
    }
}
