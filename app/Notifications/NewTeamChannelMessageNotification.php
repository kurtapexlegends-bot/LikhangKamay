<?php

namespace App\Notifications;

use App\Models\TeamMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewTeamChannelMessageNotification extends Notification
{
    use Queueable;

    public function __construct(
        protected TeamMessage $message,
        protected string $senderName,
        protected string $channelName
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'team_channel_message',
            'title' => "New message in #{$this->channelName}",
            'message' => "{$this->senderName} posted in #{$this->channelName}.",
            'team_channel_id' => $this->message->team_channel_id,
            'sender_id' => $this->message->sender_id,
            'sender_name' => $this->senderName,
            'url' => route('team-messages.index', ['channel_id' => $this->message->team_channel_id]),
        ];
    }
}
