<?php

namespace Tests\Feature\Seller;

use App\Models\User;
use App\Models\Product;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SubscriptionCancellationAndExpirationTest extends TestCase
{
    use RefreshDatabase;

    public function test_cancelling_auto_renewal_retains_active_plan_and_product_limits_until_expiration(): void
    {
        /** @var User $seller */
        $seller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->addDays(20),
            'subscription_cancelled_at' => null,
        ]);

        $this->actingAs($seller);

        $response = $this->post(route('seller.subscription.cancel-auto-renewal'));
        $response->assertRedirect();

        $seller->refresh();
        $this->assertNotNull($seller->subscription_cancelled_at);
        $this->assertEquals('premium', $seller->premium_tier);
        $this->assertTrue($seller->isPremiumTier());
        $this->assertEquals(10, $seller->getActiveProductLimit());
    }

    public function test_resuming_auto_renewal_clears_cancellation_timestamp(): void
    {
        /** @var User $seller */
        $seller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'premium_tier' => 'super_premium',
            'subscription_expires_at' => now()->addDays(15),
            'subscription_cancelled_at' => now(),
        ]);

        $this->actingAs($seller);

        $response = $this->post(route('seller.subscription.resume-auto-renewal'));
        $response->assertRedirect();

        $seller->refresh();
        $this->assertNull($seller->subscription_cancelled_at);
        $this->assertTrue($seller->isEliteTier());
        $this->assertEquals(50, $seller->getActiveProductLimit());
    }

    public function test_expired_subscription_falls_back_to_free_tier_limits(): void
    {
        /** @var User $seller */
        $seller = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'setup_completed_at' => now(),
            'premium_tier' => 'premium',
            'subscription_expires_at' => now()->subDay(), // Expired yesterday
            'subscription_cancelled_at' => now()->subDays(10),
            'pending_downgrade_tier' => 'free',
        ]);

        $this->actingAs($seller);

        $seller->refresh();
        $this->assertEquals('free', $seller->getEffectivePremiumTier());
        $this->assertFalse($seller->isPremiumTier());
        $this->assertEquals(3, $seller->getActiveProductLimit());
    }
}
