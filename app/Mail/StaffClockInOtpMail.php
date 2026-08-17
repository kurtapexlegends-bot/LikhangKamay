<?php

namespace App\Mail;

use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class StaffClockInOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public User $staff;
    public string $code;
    public int $expiresInMinutes;

    public function __construct(User $staff, string $code, int $expiresInMinutes = 10)
    {
        $this->staff = $staff;
        $this->code = $code;
        $this->expiresInMinutes = $expiresInMinutes;
    }

    public function build(): self
    {
        return $this->subject('LikhangKamay - Staff Clock-In Verification Code: ' . $this->code)
            ->view('emails.staff-clockin-otp')
            ->with([
                'staff' => $this->staff,
                'code' => $this->code,
                'expiresInMinutes' => $this->expiresInMinutes,
            ]);
    }
}
