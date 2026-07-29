<?php

namespace App\Mail;

use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ArtisanRejected extends Mailable
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
            slug: 'artisan_rejected',
            replacements: [
                '{user_name}' => $this->artisan->name,
                '{shop_name}' => $this->artisan->shop_name ?? 'LikhangKamay Shop',
                '{rejection_reason}' => $this->artisan->artisan_rejection_reason ?? 'Application did not meet minimum requirements.',
                '{action_url}' => url('/artisan/setup'),
            ],
            fallbackSubject: 'Your LikhangKamay Seller Application Needs Attention',
            fallbackView: 'emails.artisan.rejected',
            fallbackData: ['artisan' => $this->artisan]
        );
    }
}
