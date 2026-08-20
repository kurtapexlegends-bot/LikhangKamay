<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class ArtisanReengagementNotification extends Notification
{
    use Queueable;

    public function __construct(
        public ?string $customMessage = null
    ) {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'artisan_reengagement',
            'title' => 'We miss your craft on LikhangKamay!',
            'message' => $this->customMessage ?: 'Your artisan shop has been quiet recently. Log back in to check new buyer trends, update product listings, and accept custom orders.',
            'url' => route('dashboard'),
            'button_label' => 'Open Seller Dashboard',
        ];
    }
}
