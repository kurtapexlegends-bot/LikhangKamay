<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Contracts\Provider;
use Laravel\Socialite\Contracts\User as SocialiteUserContract;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    use RefreshDatabase;

    protected function fakeSocialiteUser(string $email): void
    {
        $socialUser = Mockery::mock(SocialiteUserContract::class);
        $socialUser->shouldReceive('getEmail')->andReturn($email);
        $socialUser->shouldReceive('getId')->andReturn('provider-123');
        $socialUser->shouldReceive('getAvatar')->andReturn('https://example.com/avatar.png');
        $socialUser->shouldReceive('getName')->andReturn('Social Test');

        $provider = Mockery::mock(Provider::class);
        $provider->shouldReceive('user')->once()->andReturn($socialUser);

        Socialite::shouldReceive('driver')
            ->once()
            ->with('google')
            ->andReturn($provider);
    }

    public function test_existing_verified_buyers_using_social_auth_follow_normal_buyer_redirects(): void
    {
        $user = User::factory()->create([
            'email' => 'buyer@example.com',
            'role' => 'buyer',
        ]);

        $this->fakeSocialiteUser($user->email);

        $response = $this
            ->withSession(['social_auth_role' => 'buyer', 'social_auth_remember' => false])
            ->get('/auth/google/callback');

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect('/');
    }

    public function test_existing_unverified_users_using_social_auth_are_redirected_to_email_verification(): void
    {
        $user = User::factory()->unverified()->create([
            'email' => 'unverified@example.com',
            'role' => 'buyer',
        ]);

        $this->fakeSocialiteUser($user->email);

        $response = $this
            ->withSession(['social_auth_role' => 'buyer', 'social_auth_remember' => false])
            ->get('/auth/google/callback');

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('verification.notice', absolute: false));
    }

    public function test_existing_pending_artisans_using_social_auth_are_redirected_to_pending(): void
    {
        $user = User::factory()->artisanPending()->create([
            'email' => 'artisan@example.com',
        ]);

        $this->fakeSocialiteUser($user->email);

        $response = $this
            ->withSession(['social_auth_role' => 'artisan', 'social_auth_remember' => false])
            ->get('/auth/google/callback');

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('artisan.pending', absolute: false));
    }
}
