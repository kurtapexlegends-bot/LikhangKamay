<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    public function __construct($message)
    {
        $this->message = $message;
    }

    public function broadcastOn(): array
    {
        $receiverId = $this->message instanceof Message 
            ? $this->message->receiver_id 
            : ($this->message['receiver_id'] ?? null);

        $senderId = $this->message instanceof Message 
            ? $this->message->sender_id 
            : ($this->message['sender_id'] ?? null);

        $channels = [];

        if ($receiverId) {
            $channels[] = new PrivateChannel('chat.' . $receiverId);
        }

        if ($senderId) {
            $channels[] = new PrivateChannel('chat.' . $senderId);
        }

        return $channels;
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }
}
