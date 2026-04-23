<?php

namespace Tests\Unit;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class VerifyEmailNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_verify_email_notification_uses_clean_subject_and_code_payload(): void
    {
        $user = User::factory()->create([
            'role' => 'buyer',
            'email' => 'verify.user@gmail.com',
        ]);

        $expiresAt = Carbon::now()->setTime(10, 30);

        if ($expiresAt->isPast()) {
            $expiresAt->addDay();
        }

        $message = (new VerifyEmailNotification('123456', $expiresAt))->toMail($user);
        $this->assertSame('Verify Your Email - LikhangKamay', $message->subject);
        $this->assertSame('123456', $message->viewData['code']);
        $this->assertSame(10, $message->viewData['expiresAt']->hour);
        $this->assertSame(30, $message->viewData['expiresAt']->minute);
    }
}
