<?php

namespace App\Notifications;

use App\Models\TeamMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewTeamMessageNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected TeamMessage $message,
        protected string $senderName
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'team_message',
            'title' => 'New Team Message',
            'message' => "{$this->senderName} sent you an internal message.",
            'sender_id' => $this->message->sender_id,
            'sender_name' => $this->senderName,
            'url' => route('team-messages.index', ['user_id' => $this->message->sender_id]),
        ];
    }
}
