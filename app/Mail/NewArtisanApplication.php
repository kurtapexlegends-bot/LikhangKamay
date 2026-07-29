<?php

namespace App\Mail;

use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class NewArtisanApplication extends Mailable
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
            slug: 'artisan_new_application',
            replacements: [
                '{user_name}' => $this->artisan->name,
                '{shop_name}' => $this->artisan->shop_name ?? 'LikhangKamay Shop',
                '{action_url}' => route('admin.users.manager'),
            ],
            fallbackSubject: 'New Artisan Application Submitted',
            fallbackView: 'emails.artisan.new-application',
            fallbackData: ['artisan' => $this->artisan]
        );
    }
}
