<?php

namespace App\Mail;

use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ArtisanRejected extends Mailable
{
    use Queueable, SerializesModels;

    public User $artisan;

    public function __construct(User $artisan)
    {
        $this->artisan = $artisan;
    }

    public function build()
    {
        $userName = !empty($this->artisan->name) ? $this->artisan->name : 'Artisan Applicant';
        $shopName = !empty($this->artisan->shop_name) ? $this->artisan->shop_name : 'LikhangKamay Shop';
        $rejectionReason = !empty($this->artisan->artisan_rejection_reason)
            ? $this->artisan->artisan_rejection_reason
            : 'Application did not meet minimum requirements.';

        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'artisan_rejected',
            replacements: [
                '{user_name}' => $userName,
                '{shop_name}' => $shopName,
                '{rejection_reason}' => $rejectionReason,
                '{action_url}' => url('/artisan/setup'),
            ],
            fallbackSubject: 'Your LikhangKamay Seller Application Needs Attention',
            fallbackView: 'emails.artisan.rejected',
            fallbackData: ['artisan' => $this->artisan]
        );
    }
}
