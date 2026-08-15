<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use App\Services\AuthRedirectService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RoleGuardrailsTest extends TestCase
{
    use RefreshDatabase;

    protected AuthRedirectService $redirectService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->redirectService = app(AuthRedirectService::class);
    }

    public function test_buyer_is_strictly_blocked_from_seller_and_admin_routes(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        // Attempting to access admin workspace
        $this->actingAs($buyer)->get('/admin/dashboard')->assertStatus(403);
        $this->actingAs($buyer)->get('/admin/users')->assertStatus(403);
        $this->actingAs($buyer)->get('/admin/settings')->assertStatus(403);

        // Attempting to access seller workspace routes
        $this->actingAs($buyer)->get('/dashboard')->assertRedirect('/shop');
        $this->actingAs($buyer)->get('/products')->assertStatus(403);
        $this->actingAs($buyer)->get('/orders')->assertStatus(403);
        $this->actingAs($buyer)->get('/procurement')->assertStatus(403);
        $this->actingAs($buyer)->get('/hr')->assertStatus(403);
        $this->actingAs($buyer)->get('/accounting')->assertStatus(403);
        $this->actingAs($buyer)->get('/subscription')->assertStatus(403);
    }

    public function test_buyer_intended_urls_are_strictly_sanitized_against_seller_paths(): void
    {
        $buyer = User::factory()->create([
            'role' => 'buyer',
            'email_verified_at' => now(),
        ]);

        $this->assertFalse($this->redirectService->isSafeIntendedUrlForUser($buyer, 'http://127.0.0.1:8000/procurement'));
        $this->assertFalse($this->redirectService->isSafeIntendedUrlForUser($buyer, 'http://127.0.0.1:8000/dashboard'));
        $this->assertFalse($this->redirectService->isSafeIntendedUrlForUser($buyer, 'http://127.0.0.1:8000/admin/dashboard'));
        $this->assertFalse($this->redirectService->isSafeIntendedUrlForUser($buyer, 'http://127.0.0.1:8000/products'));
        $this->assertFalse($this->redirectService->isSafeIntendedUrlForUser($buyer, 'http://127.0.0.1:8000/orders'));
        $this->assertFalse($this->redirectService->isSafeIntendedUrlForUser($buyer, 'http://127.0.0.1:8000/discounts'));

        // Public buyer paths are permitted
        $this->assertTrue($this->redirectService->isSafeIntendedUrlForUser($buyer, 'http://127.0.0.1:8000/product/sample-pottery'));
        $this->assertTrue($this->redirectService->isSafeIntendedUrlForUser($buyer, 'http://127.0.0.1:8000/cart'));
        $this->assertTrue($this->redirectService->isSafeIntendedUrlForUser($buyer, 'http://127.0.0.1:8000/saved'));
        $this->assertTrue($this->redirectService->isSafeIntendedUrlForUser($buyer, 'http://127.0.0.1:8000/shop'));
    }

    public function test_artisan_is_strictly_blocked_from_super_admin_routes(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
        ]);

        $this->actingAs($artisan)->get('/admin/dashboard')->assertStatus(403);
        $this->actingAs($artisan)->get('/admin/users')->assertStatus(403);
        $this->actingAs($artisan)->get('/admin/settings')->assertStatus(403);
    }

    public function test_pending_artisan_is_strictly_contained_to_pending_screen(): void
    {
        $pendingArtisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
        ]);

        $this->actingAs($pendingArtisan)->get('/dashboard')->assertRedirect(route('artisan.pending'));
        $this->actingAs($pendingArtisan)->get('/products')->assertRedirect(route('artisan.pending'));
        $this->actingAs($pendingArtisan)->get('/orders')->assertRedirect(route('artisan.pending'));
        $this->actingAs($pendingArtisan)->get('/subscription')->assertRedirect(route('artisan.pending'));
    }

    public function test_incomplete_artisan_is_strictly_contained_to_setup_wizard(): void
    {
        $incompleteArtisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
            'setup_completed_at' => null,
            'email_verified_at' => now(),
        ]);

        $this->actingAs($incompleteArtisan)->get('/dashboard')->assertRedirect(route('artisan.setup'));
        $this->actingAs($incompleteArtisan)->get('/products')->assertRedirect(route('artisan.setup'));
        $this->actingAs($incompleteArtisan)->get('/orders')->assertRedirect(route('artisan.setup'));
    }

    public function test_login_redirect_always_enforces_exact_home_workspace(): void
    {
        // Admin
        $admin = User::factory()->create(['role' => 'super_admin', 'email_verified_at' => now()]);
        session(['url.intended' => 'http://127.0.0.1:8000/product/sample-vase']);
        $adminRedirect = $this->redirectService->redirectAfterLogin($admin);
        $this->assertEquals(route('admin.dashboard'), $adminRedirect->getTargetUrl());

        // Artisan
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'email_verified_at' => now(),
        ]);
        session(['url.intended' => 'http://127.0.0.1:8000/product/sample-vase']);
        $artisanRedirect = $this->redirectService->redirectAfterLogin($artisan);
        $this->assertEquals(route('dashboard'), $artisanRedirect->getTargetUrl());

        // Buyer
        $buyer = User::factory()->create(['role' => 'buyer', 'email_verified_at' => now()]);
        session(['url.intended' => 'http://127.0.0.1:8000/product/sample-vase']);
        $buyerRedirect = $this->redirectService->redirectAfterLogin($buyer);
        $this->assertEquals('http://127.0.0.1:8000/product/sample-vase', $buyerRedirect->getTargetUrl());
    }
}
