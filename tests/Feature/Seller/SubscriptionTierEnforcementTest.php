<?php

namespace Tests\Feature\Seller;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}

