<?php

namespace Tests\Feature\Subscription;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubscriptionPaywallGateTest extends TestCase
{
    use RefreshDatabase;

    public function test_artisan_with_expired_subscription_is_redirected_to_subscription_gate(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'subscription_expires_at' => now()->subDay(),
            'trial_ends_at' => now()->subDay(),
        ]);

        $this->actingAs($artisan)
            ->get(route('dashboard'))
            ->assertRedirect(route('seller.subscription'));

        $this->actingAs($artisan)
            ->get(route('products.index'))
            ->assertRedirect(route('seller.subscription'));

        $this->actingAs($artisan)
            ->get(route('orders.index'))
            ->assertRedirect(route('seller.subscription'));
    }

    public function test_artisan_on_subscription_gate_receives_paywall_mode_props(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
            'subscription_expires_at' => now()->subDay(),
            'trial_ends_at' => now()->subDay(),
        ]);

        \App\Models\UserTierLog::create([
            'user_id' => $artisan->id,
            'previous_tier' => 'super_premium',
            'new_tier' => 'free',
        ]);

        $response = $this->actingAs($artisan)
            ->get(route('seller.subscription'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Settings/Subscription')
            ->where('isPaywallMode', true)
            ->where('isExpired', true)
            ->where('previousPlanKey', 'super_premium')
        );
    }

    public function test_staff_of_expired_artisan_is_redirected_to_subscription_locked_screen(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'subscription_expires_at' => now()->subDay(),
            'trial_ends_at' => now()->subDay(),
        ]);

        $staff = User::factory()->staff($artisan)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'craftsman',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['products' => true], true),
        ]);

        $this->actingAs($staff)
            ->get(route('staff.dashboard'))
            ->assertRedirect(route('staff.subscription.locked'));

        $response = $this->actingAs($staff)
            ->get(route('staff.subscription.locked'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Staff/Holding')
            ->where('staffAccount.owner_subscription_inactive', true)
            ->where('sellerOwner.subscription_inactive', true)
        );
    }

    public function test_public_catalog_excludes_products_of_expired_artisans(): void
    {
        $activeArtisan = User::factory()->artisanApproved()->create([
            'subscription_expires_at' => now()->addDays(30),
        ]);
        $activeArtisan->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
            'version' => '1.0',
        ]);

        $expiredArtisan = User::factory()->artisanApproved()->create([
            'subscription_expires_at' => now()->subDay(),
            'trial_ends_at' => now()->subDay(),
        ]);
        $expiredArtisan->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
            'version' => '1.0',
        ]);

        $this->createActiveProduct($activeArtisan, [
            'name' => 'Active Artisan Ceramic Vase',
        ]);

        $this->createActiveProduct($expiredArtisan, [
            'name' => 'Expired Artisan Clay Mug',
        ]);

        $response = $this->get(route('shop.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/Catalog')
            ->has('products.data', 1)
            ->where('products.data.0.name', 'Active Artisan Ceramic Vase')
        );
    }

    private function createActiveProduct(User $seller, array $overrides = []): Product
    {
        return Product::create([
            'user_id' => $seller->id,
            'sku' => 'SKU-' . fake()->unique()->bothify('????-####'),
            'name' => 'Sample Artisan Craft',
            'description' => 'Fine handmade piece',
            'category' => 'Pottery',
            'status' => 'Active',
            'price' => 200.00,
            'stock' => 10,
            'lead_time' => 3,
            'sold' => 0,
            ...$overrides,
        ]);
    }

    public function test_public_storefront_of_expired_artisan_shows_inactive_store_state(): void
    {
        $expiredArtisan = User::factory()->artisanApproved()->create([
            'subscription_expires_at' => now()->subDay(),
            'trial_ends_at' => now()->subDay(),
        ]);
        $expiredArtisan->complianceAgreements()->create([
            'document_type' => 'seller_terms',
            'accepted_at' => now(),
            'version' => '1.0',
        ]);

        $response = $this->get(route('shop.seller', $expiredArtisan->shop_slug));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Consumer/Shop/SellerProfile')
            ->where('isStoreInactive', true)
            ->where('products', [])
        );
    }

    public function test_visiting_subscription_page_does_not_silently_grant_30_days_to_unpaid_artisan(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'subscription_expires_at' => null,
            'trial_ends_at' => null,
        ]);

        $this->assertFalse($artisan->hasActiveSubscription());

        $this->actingAs($artisan)
            ->get(route('seller.subscription'))
            ->assertOk();

        $artisan->refresh();

        // Must NOT silently grant 30 days
        $this->assertNull($artisan->subscription_expires_at);
        $this->assertFalse($artisan->hasActiveSubscription());
    }

    public function test_staff_visiting_staff_home_redirects_to_subscription_locked_when_artisan_is_expired(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'subscription_expires_at' => now()->subDay(),
            'trial_ends_at' => now()->subDay(),
        ]);

        $staff = User::factory()->staff($artisan)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'craftsman',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['products' => true], true),
        ]);

        $this->actingAs($staff)
            ->get(route('staff.home'))
            ->assertRedirect(route('staff.subscription.locked'));
    }

    public function test_staff_visiting_dashboard_redirects_to_subscription_locked_when_artisan_is_expired(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'subscription_expires_at' => now()->subDay(),
            'trial_ends_at' => now()->subDay(),
        ]);

        $staff = User::factory()->staff($artisan)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'craftsman',
            'staff_module_permissions' => null, // no permissions
        ]);

        $this->actingAs($staff)
            ->get(route('dashboard'))
            ->assertRedirect(route('staff.subscription.locked'));
    }

    public function test_staff_seller_owner_relationship_resolves_soft_deleted_seller(): void
    {
        $artisan = User::factory()->artisanApproved()->create([
            'subscription_expires_at' => now()->addDays(30),
        ]);

        $staff = User::factory()->staff($artisan)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
        ]);

        $artisan->delete();

        $this->assertNotNull($staff->fresh()->sellerOwner);
        $this->assertTrue($staff->fresh()->sellerOwner->trashed());
    }
}
