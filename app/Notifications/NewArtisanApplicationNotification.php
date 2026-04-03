<?php

namespace App\Notifications;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class NewArtisanApplicationNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly User $artisan,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $shopName = $this->artisan->shop_name ?: 'Untitled shop';

        return [
            'type' => 'artisan_application',
            'title' => 'New Artisan Application',
            'message' => "{$this->artisan->name} submitted {$shopName} for review.",
            'url' => route('admin.pending'),
            'user_id' => $this->artisan->id,
            'shop_name' => $shopName,
        ];
    }
}
