<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class AccountingApprovalRequestedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly string $title,
        private readonly string $message,
        private readonly string $url,
        private readonly string $requestType,
        private readonly int $requestId,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'accounting_request',
            'title' => $this->title,
            'message' => $this->message,
            'request_type' => $this->requestType,
            'request_id' => $this->requestId,
            'url' => $this->url,
        ];
    }
}
