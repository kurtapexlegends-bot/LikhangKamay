<?php

namespace App\Notifications;

use App\Models\Supply;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class SupplyDepletedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Supply $supply)
    {
    }

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        return [
            'type' => 'supply_depleted',
            'title' => 'Production Halted: Out of Supply',
            'message' => "Your supply of '{$this->supply->name}' has hit zero. Production for related products may be affected.",
            'supply_id' => $this->supply->id,
            'url' => route('procurement.index'),
        ];
    }
}
