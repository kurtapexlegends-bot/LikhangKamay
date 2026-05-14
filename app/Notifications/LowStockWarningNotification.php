<?php

namespace App\Notifications;

use App\Models\Supply;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;

class LowStockWarningNotification extends Notification
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
            'type' => 'low_stock_warning',
            'title' => 'Low Stock Warning',
            'message' => "Your supply of '{$this->supply->name}' is running low ({$this->supply->quantity} {$this->supply->unit} remaining). Threshold: {$this->supply->min_stock}.",
            'supply_id' => $this->supply->id,
            'url' => route('procurement.index'),
        ];
    }
}
