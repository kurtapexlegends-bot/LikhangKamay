<?php

namespace Tests\Feature\Seller;

use App\Actions\Admin\Users\ApproveArtisan;
use App\Facades\Settings;
use App\Models\PlatformActivity;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use App\Services\PayMongoService;
use App\Services\SubscriptionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ArtisanTrialAndAnnualBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_approving_artisan_leaves_subscription_unstarted_and_requires_subscription_selection(): void
    {
        Settings::set('subscription_trial_days', 14);

        $admin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'pending',
            'business_permit' => 'permits/test.pdf',
            'dti_registration' => 'dti/test.pdf',
            'valid_id' => 'ids/test.pdf',
            'tin_id' => 'tin/test.pdf',
            'setup_completed_at' => now(),
            'has_used_trial' => false,
            'subscription_expires_at' => null,
            'trial_ends_at' => null,
        ]);

        // Mock viewing documents in session
        session()->put("artisan_review_docs_{$artisan->id}", [
            'business_permit',
            'dti_registration',
            'valid_id',
            'tin_id',
        ]);

        $this->actingAs($admin);

        app(ApproveArtisan::class)->execute($artisan->id, $admin->id);

        $artisan->refresh();

        $this->assertSame('approved', $artisan->artisan_status);
        $this->assertFalse($artisan->has_used_trial);
        $this->assertNull($artisan->trial_ends_at);
        $this->assertNull($artisan->subscription_expires_at);
        $this->assertFalse($artisan->hasActiveSubscription());

        // Approved artisan with no active subscription must be redirected to subscription gate
        $response = $this->actingAs($artisan)->get(route('dashboard'));
        $response->assertRedirect(route('seller.subscription'));
    }

    public function test_approved_artisan_can_start_14_day_basic_free_trial(): void
    {
        Settings::set('subscription_trial_days', 14);

        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'has_used_trial' => false,
            'subscription_expires_at' => null,
            'trial_ends_at' => null,
            'premium_tier' => 'free',
        ]);

        $response = $this->actingAs($artisan)->post(route('seller.subscription.start-trial'));
        $response->assertRedirect(route('dashboard'));

        $artisan->refresh();

        $this->assertTrue($artisan->has_used_trial);
        $this->assertNotNull($artisan->trial_ends_at);
        $this->assertTrue($artisan->isOnTrial());
        $this->assertTrue($artisan->hasActiveSubscription());
        $this->assertSame('free', $artisan->getEffectivePremiumTier());
        $this->assertSame('Basic', $artisan->getSellerTierLabel());
        $this->assertSame(8, $artisan->getActiveProductLimit());
        $this->assertSame(14, $artisan->getTrialDaysRemaining());

        // Once trial is active, artisan can access dashboard
        $this->actingAs($artisan)->get(route('dashboard'))->assertOk();
    }

    public function test_artisan_cannot_start_trial_twice(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'has_used_trial' => true,
            'subscription_expires_at' => null,
            'trial_ends_at' => null,
            'premium_tier' => 'free',
        ]);

        $response = $this->actingAs($artisan)->post(route('seller.subscription.start-trial'));
        $response->assertSessionHas('error');

        $artisan->refresh();
        $this->assertNull($artisan->trial_ends_at);
        $this->assertFalse($artisan->hasActiveSubscription());
    }

    public function test_artisan_trial_gracefully_reverts_to_free_tier_after_expiration(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'premium_tier' => 'free',
            'has_used_trial' => true,
            'trial_ends_at' => now()->subDay(),
            'subscription_expires_at' => now()->subDay(),
            'pending_downgrade_tier' => 'free',
        ]);

        $this->assertFalse($artisan->isOnTrial());
        $this->assertSame('free', $artisan->getEffectivePremiumTier());
        $this->assertSame(8, $artisan->getActiveProductLimit());
        $this->assertSame(0, $artisan->getTrialDaysRemaining());
    }

    public function test_artisan_can_upgrade_with_yearly_billing_and_receive_discount(): void
    {
        Settings::set('tier_premium_price', 199);
        Settings::set('subscription_annual_discount', 20.0);

        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'premium_tier' => 'free',
            'trial_ends_at' => now()->addDays(14),
            'has_used_trial' => true,
        ]);

        $mockPayMongo = $this->createMock(PayMongoService::class);
        $mockPayMongo->expects($this->once())
            ->method('createCheckoutSession')
            ->with($this->callback(function (array $payload) {
                // 199 * 12 * 0.8 = 1910.40 -> in centavos = 191040
                $this->assertSame(191040, $payload['line_items'][0]['amount']);
                $this->assertStringContainsString('Annual (20% discount applied)', $payload['line_items'][0]['description']);
                return true;
            }))
            ->willReturn([
                'id' => 'cs_test_annual_upgrade',
                'attributes' => [
                    'checkout_url' => 'https://checkout.paymongo.com/test_annual',
                ],
            ]);

        $this->app->instance(PayMongoService::class, $mockPayMongo);

        $response = $this->actingAs($artisan)
            ->withHeaders(['X-Inertia' => 'true'])
            ->post(route('seller.subscription.upgrade'), [
                'plan' => 'premium',
                'billing_cycle' => 'yearly',
            ]);

        $response->assertStatus(409); // Inertia external redirect
        $this->assertSame('https://checkout.paymongo.com/test_annual', $response->headers->get('X-Inertia-Location'));

        $transaction = SubscriptionTransaction::where('user_id', $artisan->id)->latest('id')->first();
        $this->assertNotNull($transaction);
        $this->assertSame('premium', $transaction->to_plan);
        $this->assertEquals(1910.40, (float) $transaction->amount);
        $this->assertSame('yearly', $transaction->metadata['billing_cycle'] ?? null);
        $this->assertEquals(20.0, (float) ($transaction->metadata['discount_applied'] ?? 0));
    }

    public function test_activating_yearly_subscription_grants_365_days_and_clears_trial(): void
    {
        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'premium_tier' => 'free',
            'trial_ends_at' => now()->addDays(10),
            'has_used_trial' => true,
        ]);

        $transaction = SubscriptionTransaction::create([
            'user_id' => $artisan->id,
            'from_plan' => 'free',
            'to_plan' => 'premium',
            'amount' => 1910.40,
            'currency' => 'PHP',
            'status' => SubscriptionTransaction::STATUS_PENDING,
            'reference_number' => 'SUB-YEARLY-TEST',
            'paymongo_session_id' => 'cs_test_yearly_paid',
            'metadata' => [
                'billing_cycle' => 'yearly',
                'discount_applied' => 20.0,
            ],
        ]);

        app(SubscriptionService::class)->activateSubscription($transaction, ['id' => 'cs_test_yearly_paid']);

        $artisan->refresh();

        $this->assertSame('premium', $artisan->premium_tier);
        $this->assertNull($artisan->trial_ends_at);
        $this->assertNotNull($artisan->subscription_expires_at);
        // Expiration is around 365 days in future (at least 364 full days)
        $this->assertGreaterThan(360, now()->diffInDays($artisan->subscription_expires_at));
        $this->assertSame('yearly', $artisan->billing_cycle);
    }

    public function test_super_admin_can_update_trial_days_and_annual_discount(): void
    {
        $admin = User::factory()->create([
            'role' => 'super_admin',
        ]);

        $response = $this->actingAs($admin)
            ->post(route('admin.settings.update'), [
                'subscription_trial_days' => 21,
                'subscription_annual_discount' => 25.0,
                'tier_free_price' => 349,
                'tier_premium_price' => 699,
                'tier_super_premium_price' => 1299,
                'contact_info' => [
                    'email' => 'admin@likhangkamay.com',
                ],
                'social_links' => [
                    'facebook' => 'https://facebook.com/likhangkamay',
                ],
                'convenience_fee' => 3.0,
                'maintenance_mode' => false,
                'paymongo_enabled' => true,
            ]);

        $response->assertRedirect();
        $response->assertSessionHasNoErrors();

        $this->assertSame(21, (int) Settings::get('subscription_trial_days'));
        $this->assertSame(25, (int) Settings::get('subscription_annual_discount'));
        $this->assertSame(349, (int) Settings::get('tier_free_price'));
        $this->assertSame(699, (int) Settings::get('tier_premium_price'));
        $this->assertSame(1299, (int) Settings::get('tier_super_premium_price'));
    }

    public function test_artisan_on_trial_can_subscribe_to_basic_plan(): void
    {
        Settings::set('tier_free_price', 349.00);
        Settings::set('subscription_annual_discount', 20.0);

        $artisan = User::factory()->create([
            'role' => 'artisan',
            'artisan_status' => 'approved',
            'premium_tier' => 'free',
            'trial_ends_at' => now()->addDays(14),
            'has_used_trial' => true,
        ]);

        $mockPayMongo = $this->createMock(PayMongoService::class);
        $mockPayMongo->expects($this->once())
            ->method('createCheckoutSession')
            ->with($this->callback(function (array $payload) {
                // 349 * 100 = 34900 centavos
                $this->assertSame(34900, $payload['line_items'][0]['amount']);
                $this->assertStringContainsString('Basic', $payload['line_items'][0]['description']);
                return true;
            }))
            ->willReturn([
                'id' => 'cs_test_basic_upgrade',
                'attributes' => [
                    'checkout_url' => 'https://checkout.paymongo.com/test_basic',
                ],
            ]);

        $this->app->instance(PayMongoService::class, $mockPayMongo);

        $response = $this->actingAs($artisan)
            ->withHeaders(['X-Inertia' => 'true'])
            ->post(route('seller.subscription.upgrade'), [
                'plan' => 'basic',
                'billing_cycle' => 'monthly',
            ]);

        $response->assertStatus(409);
        $this->assertSame('https://checkout.paymongo.com/test_basic', $response->headers->get('X-Inertia-Location'));

        $transaction = SubscriptionTransaction::where('user_id', $artisan->id)->latest('id')->first();
        $this->assertNotNull($transaction);
        $this->assertSame('free', $transaction->to_plan);
        $this->assertEquals(349.00, (float) $transaction->amount);
    }
}
