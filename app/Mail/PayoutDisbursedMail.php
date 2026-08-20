<?php

namespace App\Mail;

use App\Models\Payout;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class PayoutDisbursedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public Payout $payout,
        public User $artisan
    ) {
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Payout Sent: ₱' . number_format($this->payout->amount, 2) . ' transferred to your account',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.artisan.payout-disbursed',
            with: [
                'payout' => $this->payout,
                'artisan' => $this->artisan,
            ]
        );
    }
}
