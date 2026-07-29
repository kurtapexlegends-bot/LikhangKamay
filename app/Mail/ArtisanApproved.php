<?php

namespace App\Mail;

use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ArtisanApproved extends Mailable
{
    use SerializesModels;

    public User $artisan;

    public function __construct(User $artisan)
    {
        $this->artisan = $artisan;
    }

    public function build()
    {
        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'artisan_approved',
            replacements: [
                '{user_name}' => $this->artisan->name,
                '{shop_name}' => $this->artisan->shop_name ?? 'LikhangKamay Shop',
                '{action_url}' => url('/dashboard'),
            ],
            fallbackSubject: 'Your LikhangKamay Seller Account is Approved!',
            fallbackView: 'emails.artisan.approved',
            fallbackData: ['artisan' => $this->artisan]
        );
    }
}
