<?php

namespace Tests\Unit;

use App\Models\User;
use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VerifyEmailNotificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_verify_email_notification_uses_clean_subject_and_signed_url(): void
    {
        $user = User::factory()->create([
            'role' => 'buyer',
            'email' => 'verify.user@gmail.com',
        ]);

        $message = (new VerifyEmailNotification())->toMail($user);

        $this->assertSame('Verify Your Email - LikhangKamay', $message->subject);
        $this->assertStringContainsString('/verify-email/', $message->viewData['url']);
        $this->assertStringContainsString('signature=', $message->viewData['url']);
    }
}
