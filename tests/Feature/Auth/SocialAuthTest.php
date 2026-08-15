<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as SocialiteUser;
use Mockery;
use Tests\TestCase;

class SocialAuthTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_redirect_to_google_provider(): void
    {
        $response = $this->get(route('auth.social', ['provider' => 'google']));

        $response->assertStatus(302);
        $this->assertStringContainsString('accounts.google.com', $response->headers->get('Location') ?? '');
    }

    public function test_existing_user_logs_in_via_google_callback_and_populates_current_session_id(): void
    {
        $user = User::factory()->create([
            'email' => 'kurtapexlegends@gmail.com',
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
            'current_session_id' => 'stale_old_session_123',
        ]);
        $user->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        $abstractUser = Mockery::mock(SocialiteUser::class);
        $abstractUser->shouldReceive('getId')->andReturn('google-12345');
        $abstractUser->shouldReceive('getEmail')->andReturn('kurtapexlegends@gmail.com');
        $abstractUser->shouldReceive('getName')->andReturn('Kurt Talastas');
        $abstractUser->shouldReceive('getAvatar')->andReturn('https://lh3.googleusercontent.com/a/avatar.jpg');

        $provider = Mockery::mock(\Laravel\Socialite\Two\GoogleProvider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($abstractUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/auth/google/callback');

        $response->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);

        // Verify current_session_id was updated to the active session ID
        $this->assertNotNull($user->fresh()->current_session_id);
        $this->assertNotEquals('stale_old_session_123', $user->fresh()->current_session_id);
    }

    public function test_new_user_redirects_to_complete_profile(): void
    {
        $abstractUser = Mockery::mock(SocialiteUser::class);
        $abstractUser->shouldReceive('getId')->andReturn('google-99999');
        $abstractUser->shouldReceive('getEmail')->andReturn('newuser@gmail.com');
        $abstractUser->shouldReceive('getName')->andReturn('New Google User');
        $abstractUser->shouldReceive('getAvatar')->andReturn('https://lh3.googleusercontent.com/a/new.jpg');

        $provider = Mockery::mock(\Laravel\Socialite\Two\GoogleProvider::class);
        $provider->shouldReceive('stateless')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($abstractUser);

        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);

        $response = $this->get('/auth/google/callback');

        $response->assertRedirect(route('auth.complete-profile'));
        $this->assertGuest();
        $this->assertEquals('newuser@gmail.com', session('social_auth.email'));
    }
}
