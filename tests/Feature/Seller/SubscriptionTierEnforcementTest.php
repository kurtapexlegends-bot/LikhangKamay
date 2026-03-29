<?php

namespace Tests\Feature\Seller;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SubscriptionTierEnforcementTest extends TestCase
{
    use RefreshDatabase;

    public function test_standard_seller_cannot_export_analytics_report(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'free',
        ]);

        $this->actingAs($seller)
            ->get(route('analytics.export'))
            ->assertForbidden();
    }

    public function test_premium_seller_can_export_analytics_report(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $response = $this->actingAs($seller)->get(route('analytics.export'));

        $response->assertOk();
        $this->assertStringStartsWith('text/csv', (string) $response->headers->get('content-type'));
    }

    public function test_only_elite_sellers_can_access_sponsorship_module(): void
    {
        $premiumSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);
        $eliteSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $this->actingAs($premiumSeller)
            ->get(route('seller.sponsorships'))
            ->assertForbidden();

        $this->actingAs($eliteSeller)
            ->get(route('seller.sponsorships'))
            ->assertOk();
    }
    public function test_downgrade_logs_the_original_previous_tier(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $this->actingAs($seller)
            ->from(route('seller.subscription'))
            ->post(route('seller.subscription.downgrade'), [
                'plan' => 'premium',
            ])
            ->assertRedirect();

        $this->assertDatabaseHas('user_tier_logs', [
            'user_id' => $seller->id,
            'previous_tier' => 'super_premium',
            'new_tier' => 'premium',
        ]);
    }

    public function test_subscription_page_includes_linked_staff_count_for_elite_downgrade_warning(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        User::factory()->staff($seller)->count(2)->create();

        $response = $this->actingAs($seller)->get(route('seller.subscription'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Subscription')
            ->where('currentPlan', 'super_premium')
            ->where('linkedStaffCount', 2)
        );
    }

    public function test_elite_to_standard_downgrade_suspends_linked_staff_and_elite_only_features(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $staff = User::factory()->staff($seller)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        $response = $this->actingAs($seller)
            ->from(route('seller.subscription'))
            ->post(route('seller.subscription.downgrade'), [
                'plan' => 'free',
            ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Plan downgraded successfully. Excess products set to Draft. Elite-only features were suspended, and linked employee workspace accounts were suspended until you upgrade again.');
        $this->assertSame('free', $seller->fresh()->premium_tier);
        $this->assertNotNull($staff->fresh()->staff_plan_suspended_at);

        $this->actingAs($seller)
            ->get(route('seller.sponsorships'))
            ->assertForbidden();

        $this->actingAs($staff->fresh())
            ->get(route('dashboard'))
            ->assertRedirect(route('staff.home', absolute: false));

        $this->actingAs($staff->fresh())
            ->get(route('team-messages.index'))
            ->assertForbidden();
    }

    public function test_reupgrade_clears_only_plan_suspension_and_preserves_manual_staff_suspension(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        $staff = User::factory()->staff($seller)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], false),
        ]);

        $this->actingAs($seller)->post(route('seller.subscription.downgrade'), [
            'plan' => 'free',
        ])->assertRedirect();

        $this->assertNotNull($staff->fresh()->staff_plan_suspended_at);

        $this->actingAs($seller)->post(route('seller.subscription.upgrade'), [
            'plan' => 'premium',
        ])->assertRedirect();

        $staff->refresh();

        $this->assertNull($staff->staff_plan_suspended_at);
        $this->assertFalse($staff->isWorkspaceAccessEnabled());
        $this->actingAs($staff)
            ->get(route('dashboard'))
            ->assertRedirect(route('staff.home', absolute: false));
    }
}

