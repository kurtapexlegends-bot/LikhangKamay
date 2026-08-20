<?php

namespace App\Notifications;

use App\Mail\PayoutDisbursedMail;
use App\Models\Payout;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;

class PayoutDisbursedNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        public readonly Payout $payout,
        public readonly ?User $artisan = null
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    public function toMail(object $notifiable): PayoutDisbursedMail
    {
        $artisan = $this->artisan instanceof User ? $this->artisan : $notifiable;
        return (new PayoutDisbursedMail($this->payout, $artisan))->to($notifiable->email);
    }

    public function toArray(object $notifiable): array
    {
        $amountFormatted = number_format($this->payout->amount, 2);
        $method = $this->payout->payout_method ?: 'GCash';
        $refText = $this->payout->reference_number ? " (Ref: {$this->payout->reference_number})" : "";

        return [
            'type' => 'payout_disbursed',
            'title' => 'Shop Payout Sent',
            'message' => "Good news! ₱{$amountFormatted} has been sent to your {$method} account{$refText}.",
            'amount' => (float) $this->payout->amount,
            'payout_method' => $this->payout->payout_method,
            'reference_number' => $this->payout->reference_number,
            'payout_id' => $this->payout->id,
            'url' => route('accounting.index', ['tab' => 'history']),
        ];
    }
}
