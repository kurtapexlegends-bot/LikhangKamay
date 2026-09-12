<?php

namespace App\Mail;

use App\Models\Employee;
use App\Models\User;
use App\Services\EmailTemplateService;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class StaffWelcomeInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public User $staffUser,
        public ?Employee $employee = null,
        public ?string $shopName = null,
        public ?string $temporaryPassword = null
    ) {
        $this->shopName = $shopName ?? $staffUser->sellerOwner?->shop_name ?? 'Artisan Studio';
    }

    public function build()
    {
        $this->staffUser->loadMissing('sellerOwner');

        $userName = !empty($this->staffUser->name)
            ? $this->staffUser->name
            : (!empty($this->employee?->name) ? $this->employee->name : 'Studio Team Member');

        $shopName = $this->shopName ?: ($this->staffUser->sellerOwner?->shop_name ?: 'Artisan Studio');

        $rawRole = $this->employee?->role ?? $this->staffUser->staff_role_preset_key ?? 'Staff Member';
        $formattedRole = ucwords(str_replace(['_', '-'], ' ', $rawRole));

        $temporaryPassword = $this->temporaryPassword ?: '(Password set by owner)';

        return EmailTemplateService::apply(
            mailable: $this,
            slug: 'staff_welcome_invite',
            replacements: [
                '{user_name}' => $userName,
                '{shop_name}' => $shopName,
                '{role_name}' => $formattedRole,
                '{login_email}' => $this->staffUser->email,
                '{temporary_password}' => $temporaryPassword,
                '{action_url}' => url('/login'),
            ],
            fallbackSubject: "Welcome to {$shopName} on LikhangKamay!",
            fallbackView: 'emails.staff.welcome-invite',
            fallbackData: [
                'staffUser' => $this->staffUser,
                'userName' => $userName,
                'employee' => $this->employee,
                'shopName' => $shopName,
                'employeeRole' => $formattedRole,
                'temporaryPassword' => $this->temporaryPassword,
                'loginUrl' => url('/login'),
            ]
        );
    }
}
