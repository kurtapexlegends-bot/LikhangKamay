<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\EmailVerificationCodeService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class EmailVerificationTest extends TestCase
{
    use RefreshDatabase;

    public function test_email_verification_screen_can_be_rendered(): void
    {
        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user)->get('/verify-email');

        $response->assertStatus(200);
    }

    public function test_email_can_be_verified_with_valid_code(): void
    {
        $user = User::factory()->unverified()->create();
        [$code] = app(EmailVerificationCodeService::class)->issue($user);

        Event::fake();

        $response = $this->actingAs($user)->post(route('verification.code'), [
            'code' => $code,
        ]);

        Event::assertDispatched(Verified::class);
        $this->assertTrue($user->fresh()->hasVerifiedEmail());
        $response->assertRedirect('/?verified=1');
    }

    public function test_email_is_not_verified_with_invalid_code(): void
    {
        $user = User::factory()->unverified()->create();
        app(EmailVerificationCodeService::class)->issue($user);

        $this->actingAs($user)
            ->from(route('verification.notice'))
            ->post(route('verification.code'), [
                'code' => '000000',
            ])
            ->assertSessionHasErrors('code');

        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_unverified_user_can_request_another_verification_email(): void
    {
        Notification::fake();

        $user = User::factory()->unverified()->create();

        $response = $this->actingAs($user)->post(route('verification.send'));

        $response
            ->assertRedirect()
            ->assertSessionHas('status', 'verification-code-sent');

        Notification::assertSentTo($user, \App\Notifications\VerifyEmailNotification::class);
    }
}
