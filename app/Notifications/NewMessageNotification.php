<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Models\Message;

class NewMessageNotification extends Notification
{
    use Queueable;

    protected $message;
    protected $senderName;

    /**
     * Create a new notification instance.
     */
    public function __construct(Message $message, string $senderName)
    {
        $this->message = $message;
        $this->senderName = $senderName;
    }

    /**
     * Get the notification's delivery channels.
     *
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Get the array representation of the notification.
     *
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'new_message',
            'title' => 'New Message',
            'message' => "{$this->senderName} sent you a message.",
            'sender_id' => $this->message->sender_id,
            'sender_name' => $this->senderName,
            'url' => route('chat.index', ['user_id' => $this->message->sender_id]),
        ];
    }
}
