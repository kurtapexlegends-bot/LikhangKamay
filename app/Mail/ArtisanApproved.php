<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ArtisanApproved extends Mailable
{
    use SerializesModels;

    public User $artisan;

    public function __construct(User $artisan)
    {
        $this->artisan = $artisan;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: '🎉 Your LikhangKamay Seller Account is Approved!',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.artisan.approved',
        );
    }
}
