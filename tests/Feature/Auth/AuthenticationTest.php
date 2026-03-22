<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_screen_can_be_rendered(): void
    {
        $response = $this->get('/login');

        $response->assertStatus(200);
    }

    public function test_users_can_authenticate_using_the_login_screen(): void
    {
        $user = User::factory()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticated();
        $response->assertRedirect('/shop');
    }

    public function test_super_admins_are_redirected_to_the_admin_dashboard_after_login(): void
    {
        $user = User::factory()->superAdmin()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('admin.dashboard', absolute: false));
    }

    public function test_artisan_owners_without_completed_setup_are_redirected_to_setup_after_login(): void
    {
        $user = User::factory()->artisanWithoutSetup()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('artisan.setup', absolute: false));
    }

    public function test_pending_artisan_owners_are_redirected_to_pending_after_login(): void
    {
        $user = User::factory()->artisanPending()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('artisan.pending', absolute: false));
    }

    public function test_approved_artisan_owners_are_redirected_to_dashboard_after_login(): void
    {
        $user = User::factory()->artisanApproved()->create();

        $response = $this->post('/login', [
            'email' => $user->email,
            'password' => 'password',
        ]);

        $this->assertAuthenticatedAs($user);
        $response->assertRedirect(route('dashboard', absolute: false));
    }

    public function test_pending_artisan_owners_cannot_access_seller_workspace_or_owner_only_seller_routes(): void
    {
        $user = User::factory()->artisanPending()->create();

        $this->actingAs($user)
            ->get(route('orders.index'))
            ->assertForbidden();

        $this->actingAs($user)
            ->get(route('seller.subscription'))
            ->assertForbidden();
    }

    public function test_artisan_owners_without_completed_setup_cannot_access_seller_workspace_or_owner_only_seller_routes(): void
    {
        $user = User::factory()->artisanWithoutSetup()->create();

        $this->actingAs($user)
            ->get(route('products.index'))
            ->assertForbidden();

        $this->actingAs($user)
            ->get(route('seller.subscription'))
            ->assertForbidden();
    }

    public function test_users_can_not_authenticate_with_invalid_password(): void
    {
        $user = User::factory()->create();

        $this->post('/login', [
            'email' => $user->email,
            'password' => 'wrong-password',
        ]);

        $this->assertGuest();
    }

    public function test_users_can_logout(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->post('/logout');

        $this->assertGuest();
        $response->assertRedirect('/');
    }
}
