<?php

namespace Tests\Feature\Compliance;

use App\Models\User;
use App\Models\Product;
use App\Models\SellerComplianceAgreement;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Auth;
use Tests\TestCase;

class SellerOnboardingComplianceTest extends TestCase
{
    use RefreshDatabase;

    public function test_artisan_manual_registration_requires_terms_and_creates_compliance_record(): void
    {
        $response = $this->post(route('register'), [
            'first_name' => 'Juan',
            'last_name' => 'Dela Cruz',
            'email' => 'juan.artisan@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'shop_name' => 'Juan Pottery Shop',
            'terms' => true,
        ]);

        $response->assertRedirect();
        
        $user = User::where('email', 'juan.artisan@example.com')->first();
        $this->assertNotNull($user);
        $this->assertSame('artisan', $user->role);
        
        // Assert that the compliance record was stored
        $this->assertTrue($user->hasAcceptedComplianceTerms('seller_terms'));
        
        $agreement = $user->complianceAgreements()->where('document_type', 'seller_terms')->first();
        $this->assertNotNull($agreement);
        $this->assertSame('127.0.0.1', $agreement->ip_address);
    }

    public function test_social_auth_complete_profile_as_artisan_creates_compliance_record(): void
    {
        // Put mock social data in session
        session([
            'social_auth' => [
                'provider' => 'google',
                'id' => '1234567890',
                'email' => 'maria.artisan@example.com',
                'name' => 'Maria Makiling',
                'avatar' => 'avatar.jpg',
                'role' => 'artisan',
                'remember' => false,
            ]
        ]);

        $response = $this->post(route('auth.complete-profile.store'), [
            'first_name' => 'Maria',
            'last_name' => 'Makiling',
            'shop_name' => 'Maria Clay Arts',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'terms' => true,
        ]);

        $response->assertRedirect();

        $user = User::where('email', 'maria.artisan@example.com')->first();
        $this->assertNotNull($user);
        $this->assertSame('artisan', $user->role);

        // Assert compliance record was stored
        $this->assertTrue($user->hasAcceptedComplianceTerms('seller_terms'));
    }

    public function test_compliance_middleware_blocks_non_compliant_sellers_from_seller_routes(): void
    {
        /** @var User $nonCompliantSeller */
        $nonCompliantSeller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);
        $nonCompliantSeller->complianceAgreements()->delete();

        // Trying to access orders index should redirect or throw 403 because terms have not been accepted
        $response = $this->actingAs($nonCompliantSeller)
            ->get(route('orders.index'));

        $response->assertRedirect(route('artisan.setup'));
        $response->assertSessionHas('error', 'Please accept the Seller Agreement terms to proceed.');

        // For AJAX/Inertia requests, it should abort with 403
        $response = $this->actingAs($nonCompliantSeller)
            ->get(route('orders.index'), ['X-Header' => 'value', 'Accept' => 'application/json']);

        $response->assertStatus(403);
    }

    public function test_compliant_and_approved_sellers_can_access_seller_routes(): void
    {
        /** @var User $compliantSeller */
        $compliantSeller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);

        // Store compliance acceptance
        $compliantSeller->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
            'ip_address' => '127.0.0.1',
        ]);

        $response = $this->actingAs($compliantSeller)
            ->get(route('orders.index'));

        // Should allow access (since they are approved and compliant)
        $response->assertStatus(200);
    }

    public function test_unapproved_or_non_compliant_sellers_are_hidden_from_marketplace(): void
    {
        // 1. Unapproved seller (setup completed, but pending, accepted terms)
        $pendingSeller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
            'shop_name' => 'Pending Shop',
            'shop_slug' => 'pending-shop',
        ]);
        $pendingSeller->complianceAgreements()->delete();
        $pendingSeller->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
        ]);

        // 2. Approved but non-compliant seller
        $nonCompliantSeller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'shop_name' => 'Non Compliant Shop',
            'shop_slug' => 'non-compliant-shop',
        ]);
        $nonCompliantSeller->complianceAgreements()->delete();

        // Create active products for both
        $pendingProduct = Product::create([
            'user_id' => $pendingSeller->id,
            'sku' => 'PENDING-001',
            'name' => 'Pending Vase',
            'category' => 'Vases',
            'status' => 'Active',
            'price' => 100,
            'cost_price' => 50,
            'stock' => 5,
        ]);

        $nonCompliantProduct = Product::create([
            'user_id' => $nonCompliantSeller->id,
            'sku' => 'NONCOMP-001',
            'name' => 'Non-Compliant Pot',
            'category' => 'Pots',
            'status' => 'Active',
            'price' => 200,
            'cost_price' => 100,
            'stock' => 10,
        ]);

        // Public seller profile for pending seller should abort 404
        $response = $this->get(route('shop.seller', $pendingSeller->shop_slug));
        $response->assertStatus(404);

        // Public seller profile for non-compliant seller should abort 404
        $response = $this->get(route('shop.seller', $nonCompliantSeller->shop_slug));
        $response->assertStatus(404);

        // Search catalog should NOT contain their products
        $response = $this->get(route('shop.index'));
        $response->assertStatus(200);

        // Assert products are not visible in catalog Inertia page data
        $products = $response->original->getData()['page']['props']['products']['data'] ?? [];
        $productNames = collect($products)->pluck('name');
        
        $this->assertNotContains('Pending Vase', $productNames);
        $this->assertNotContains('Non-Compliant Pot', $productNames);
    }

    public function test_approved_artisan_can_accept_compliance_terms_via_endpoint(): void
    {
        /** @var User $seller */
        $seller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
        ]);
        $seller->complianceAgreements()->delete();

        $this->assertFalse($seller->hasAcceptedComplianceTerms('seller_terms'));

        $response = $this->actingAs($seller)
            ->post(route('artisan.accept-terms'));

        $response->assertRedirect();
        $this->assertTrue($seller->fresh()->hasAcceptedComplianceTerms('seller_terms'));
    }
}
