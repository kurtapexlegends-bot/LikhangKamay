<?php

namespace App\Mail;

use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ArtisanApproved extends Mailable
{
    use Queueable, SerializesModels;

    public User $artisan;

    public function __construct(User $artisan)
    {
        $this->artisan = $artisan;
    }

    public function build()
    {
        $userName = !empty($this->artisan->name) ? $this->artisan->name : 'Artisan Partner';
        $shopName = !empty($this->artisan->shop_name) ? $this->artisan->shop_name : 'LikhangKamay Shop';

        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'artisan_approved',
            replacements: [
                '{user_name}' => $userName,
                '{shop_name}' => $shopName,
                '{action_url}' => url('/dashboard'),
            ],
            fallbackSubject: 'Your LikhangKamay Seller Account is Approved!',
            fallbackView: 'emails.artisan.approved',
            fallbackData: ['artisan' => $this->artisan]
        );
    }
}
