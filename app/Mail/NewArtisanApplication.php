<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class NewArtisanApplication extends Mailable
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
            subject: 'New Artisan Application - '.$this->artisan->shop_name,
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.artisan.new-application',
        );
    }
}
