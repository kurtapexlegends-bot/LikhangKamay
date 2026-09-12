<?php

namespace App\Mail;

use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewArtisanApplication extends Mailable
{
    use Queueable, SerializesModels;

    public User $artisan;

    public function __construct(User $artisan)
    {
        $this->artisan = $artisan;
    }

    public function build()
    {
        $userName = !empty($this->artisan->name) ? $this->artisan->name : 'New Applicant';
        $shopName = !empty($this->artisan->shop_name) ? $this->artisan->shop_name : 'Pending Shop';

        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'artisan_new_application',
            replacements: [
                '{user_name}' => $userName,
                '{shop_name}' => $shopName,
                '{action_url}' => route('admin.users.manager'),
            ],
            fallbackSubject: 'New Artisan Application Submitted',
            fallbackView: 'emails.artisan.new-application',
            fallbackData: ['artisan' => $this->artisan]
        );
    }
}
