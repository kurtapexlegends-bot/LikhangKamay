<?php

namespace App\Events;

use App\Models\TeamMessage;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TeamMessageReactionUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $messageId;
    public $reactions;
    
    private TeamMessage $message;

    public function __construct(TeamMessage $message, array $reactions)
    {
        $this->message = $message;
        $this->messageId = $message->id;
        $this->reactions = $reactions;
    }

    public function broadcastOn(): array
    {
        $channelId = $this->message->team_channel_id;

        if ($channelId) {
            $channels = [new PrivateChannel('team-channel.' . $channelId)];

            // Also notify all channel members via their private chat channels
            $memberIds = \App\Models\TeamChannelMember::where('team_channel_id', $channelId)
                ->pluck('user_id');

            foreach ($memberIds as $memberId) {
                $channels[] = new PrivateChannel('team-chat.' . $memberId);
            }

            return $channels;
        }

        $receiverId = $this->message->receiver_id;
        $senderId = $this->message->sender_id;

        $channels = [];

        if ($receiverId) {
            $channels[] = new PrivateChannel('team-chat.' . $receiverId);
        }

        if ($senderId) {
            $channels[] = new PrivateChannel('team-chat.' . $senderId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'team.message.reaction.updated';
    }
}
