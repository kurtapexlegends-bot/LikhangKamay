<?php

namespace Tests\Feature\Auth;

use App\Notifications\VerifyEmailNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

class RegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_registration_screen_can_be_rendered(): void
    {
        $response = $this->get('/register');

        $response->assertStatus(200);
    }

    public function test_new_users_can_register(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('verification.notice', absolute: false));
        Notification::assertSentTo(auth()->user(), VerifyEmailNotification::class);
    }

    public function test_new_artisans_can_register_before_completing_shop_setup(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'first_name' => 'Clay',
            'last_name' => 'Seller',
            'shop_name' => 'Clay Seller Studio',
            'email' => 'artisan@example.com',
            'password' => 'password1234',
            'password_confirmation' => 'password1234',
            'terms' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('verification.notice', absolute: false));
        Notification::assertSentTo(auth()->user(), VerifyEmailNotification::class);

        $this->assertDatabaseHas('users', [
            'email' => 'artisan@example.com',
            'role' => 'artisan',
            'shop_name' => 'Clay Seller Studio',
            'name' => 'Clay Seller',
            'first_name' => 'Clay',
            'last_name' => 'Seller',
        ]);
    }

    public function test_registration_still_accepts_a_single_first_name(): void
    {
        Notification::fake();

        $response = $this->post('/register', [
            'first_name' => 'Madonna',
            'last_name' => '',
            'email' => 'madonna@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('verification.notice', absolute: false));
        Notification::assertSentTo(auth()->user(), VerifyEmailNotification::class);

        $this->assertDatabaseHas('users', [
            'email' => 'madonna@example.com',
            'name' => 'Madonna',
            'first_name' => 'Madonna',
            'last_name' => null,
        ]);
    }

    public function test_social_complete_profile_accepts_first_and_last_name_fields(): void
    {
        $response = $this
            ->withSession([
                'social_auth' => [
                    'provider' => 'google',
                    'id' => 'google-123',
                    'email' => 'social@example.com',
                    'name' => 'Social User',
                    'avatar' => 'https://example.com/avatar.png',
                    'role' => 'buyer',
                    'remember' => false,
                ],
            ])
            ->post(route('auth.complete-profile.store'), [
                'first_name' => 'Social',
                'last_name' => 'User',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'terms' => true,
            ]);

        $response->assertRedirect('/');

        $this->assertDatabaseHas('users', [
            'email' => 'social@example.com',
            'name' => 'Social User',
            'first_name' => 'Social',
            'last_name' => 'User',
            'social_provider' => 'google',
            'social_id' => 'google-123',
        ]);
    }

    public function test_social_complete_profile_requires_accepted_terms_for_buyers(): void
    {
        $response = $this
            ->withSession([
                'social_auth' => [
                    'provider' => 'google',
                    'id' => 'google-terms',
                    'email' => 'social-terms@example.com',
                    'name' => 'Social Terms',
                    'avatar' => 'https://example.com/avatar.png',
                    'role' => 'buyer',
                    'remember' => false,
                ],
            ])
            ->from(route('auth.complete-profile'))
            ->post(route('auth.complete-profile.store'), [
                'first_name' => 'Social',
                'last_name' => 'Terms',
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'terms' => false,
            ]);

        $response->assertRedirect(route('auth.complete-profile'));
        $response->assertSessionHasErrors('terms');
        $this->assertDatabaseMissing('users', ['email' => 'social-terms@example.com']);
    }

    public function test_social_complete_profile_requires_accepted_terms_for_artisans(): void
    {
        $response = $this
            ->withSession([
                'social_auth' => [
                    'provider' => 'google',
                    'id' => 'google-artisan-terms',
                    'email' => 'artisan-social@example.com',
                    'name' => 'Artisan Social',
                    'avatar' => 'https://example.com/avatar.png',
                    'role' => 'artisan',
                    'remember' => false,
                ],
            ])
            ->from(route('auth.complete-profile'))
            ->post(route('auth.complete-profile.store'), [
                'first_name' => 'Artisan',
                'last_name' => 'Social',
                'shop_name' => 'Social Pottery',
                'password' => 'password1234',
                'password_confirmation' => 'password1234',
                'terms' => false,
            ]);

        $response->assertRedirect(route('auth.complete-profile'));
        $response->assertSessionHasErrors('terms');
        $this->assertDatabaseMissing('users', ['email' => 'artisan-social@example.com']);
    }

    public function test_unverified_user_can_retry_registration_with_same_email(): void
    {
        Notification::fake();

        // Create an unverified user
        \App\Models\User::factory()->create([
            'email' => 'unverified@example.com',
            'email_verified_at' => null,
            'role' => 'artisan',
            'shop_name' => 'Old Shop',
        ]);

        $response = $this->post('/register', [
            'first_name' => 'Updated',
            'last_name' => 'Seller',
            'shop_name' => 'Updated Shop',
            'email' => 'unverified@example.com',
            'password' => 'newpassword123',
            'password_confirmation' => 'newpassword123',
            'terms' => true,
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect(route('verification.notice', absolute: false));
        Notification::assertSentTo(auth()->user(), VerifyEmailNotification::class);

        $this->assertDatabaseHas('users', [
            'email' => 'unverified@example.com',
            'shop_name' => 'Updated Shop',
            'name' => 'Updated Seller',
        ]);
    }

    public function test_verified_user_cannot_register_with_same_email(): void
    {
        Notification::fake();

        // Create a verified user
        \App\Models\User::factory()->create([
            'email' => 'verified@example.com',
            'email_verified_at' => now(),
        ]);

        $response = $this->post('/register', [
            'first_name' => 'Another',
            'last_name' => 'Person',
            'email' => 'verified@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'terms' => true,
        ]);

        $response->assertSessionHasErrors('email');
    }

    public function test_artisan_registration_fails_if_password_is_shorter_than_12_characters(): void
    {
        $response = $this->post('/register', [
            'first_name' => 'Clay',
            'last_name' => 'Seller',
            'shop_name' => 'Clay Studio Unique',
            'email' => 'artisan-short@example.com',
            'password' => 'short-12345',
            'password_confirmation' => 'short-12345',
            'terms' => true,
        ]);

        $response->assertSessionHasErrors('password');
        $this->assertEquals(
            'The password field must be at least 12 characters.',
            session('errors')->first('password')
        );
    }
}
