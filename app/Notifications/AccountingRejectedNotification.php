<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class AccountingRejectedNotification extends Notification
{
    use Queueable;

    protected string $title;
    protected string $message;
    protected string $url;
    protected string $requestType;
    protected int $requestId;
    protected string $reason;

    /**
     * Create a new notification instance.
     */
    public function __construct(
        string $title,
        string $message,
        string $url,
        string $requestType,
        int $requestId,
        string $reason
    )
    {
        $this->title = $title;
        $this->message = $message;
        $this->url = $url;
        $this->requestType = $requestType;
        $this->requestId = $requestId;
        $this->reason = $reason;
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
            'type' => 'accounting_rejected',
            'title' => $this->title,
            'message' => $this->message,
            'reason' => $this->reason,
            'request_type' => $this->requestType,
            'request_id' => $this->requestId,
            'url' => $this->url,
        ];
    }
}
