<?php

namespace App\Mail;

use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ArtisanApplicationReceivedMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public User $user)
    {
    }

    public function build()
    {
        $userName = !empty($this->user->name) ? $this->user->name : 'Artisan Applicant';
        $shopName = !empty($this->user->shop_name) ? $this->user->shop_name : 'Your Artisan Studio';

        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'artisan_application_received',
            replacements: [
                '{user_name}' => $userName,
                '{shop_name}' => $shopName,
                '{action_url}' => route('artisan.pending'),
            ],
            fallbackSubject: 'Application Received: Your Shop is in Review - LikhangKamay',
            fallbackView: 'emails.artisan.application-received',
            fallbackData: [
                'user' => $this->user,
                'userName' => $userName,
                'shopName' => $shopName,
            ]
        );
    }
}
