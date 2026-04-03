<?php

namespace Tests\Feature\Auth;

use Illuminate\Foundation\Testing\RefreshDatabase;
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
        $response = $this->post('/register', [
            'first_name' => 'Test',
            'last_name' => 'User',
            'email' => 'test@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms' => true,
        ]);

        $this->assertGuest();
        $response->assertRedirect(route('login', absolute: false));
    }

    public function test_new_artisans_can_register_before_completing_shop_setup(): void
    {
        $response = $this->post('/register', [
            'first_name' => 'Clay',
            'last_name' => 'Seller',
            'shop_name' => 'Clay Seller Studio',
            'email' => 'artisan@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms' => true,
        ]);

        $this->assertGuest();
        $response->assertRedirect(route('login', absolute: false));

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
        $response = $this->post('/register', [
            'first_name' => 'Madonna',
            'last_name' => '',
            'email' => 'madonna@example.com',
            'password' => 'password',
            'password_confirmation' => 'password',
            'terms' => true,
        ]);

        $response->assertRedirect(route('login', absolute: false));

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

        $response->assertRedirect('/shop');

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
                'password' => 'password123',
                'password_confirmation' => 'password123',
                'terms' => false,
            ]);

        $response->assertRedirect(route('auth.complete-profile'));
        $response->assertSessionHasErrors('terms');
        $this->assertDatabaseMissing('users', ['email' => 'artisan-social@example.com']);
    }
}
