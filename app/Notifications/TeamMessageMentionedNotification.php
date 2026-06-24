<?php

namespace App\Notifications;

use App\Models\TeamMessage;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class TeamMessageMentionedNotification extends Notification
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
        $channelId = $this->message->team_channel_id;
        $url = $channelId 
            ? route('team-messages.index', ['channel_id' => $channelId])
            : route('team-messages.index', ['user_id' => $this->message->sender_id]);

        $this->message->loadMissing('teamChannel');
        $locationLabel = $channelId 
            ? "in #" . ($this->message->teamChannel?->name ?? 'channel')
            : "in a direct message";

        return [
            'type' => 'team_mention',
            'title' => 'Mentioned in Chat',
            'message' => "{$this->senderName} mentioned you {$locationLabel}.",
            'sender_id' => $this->message->sender_id,
            'sender_name' => $this->senderName,
            'team_channel_id' => $channelId,
            'team_message_id' => $this->message->id,
            'url' => $url,
        ];
    }
}
