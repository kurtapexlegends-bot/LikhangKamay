<?php

namespace Tests\Feature\Subscription;

use App\Facades\Settings;
use App\Models\Order;
use App\Models\User;
use App\Services\SubscriptionPlanService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DynamicSubscriptionCustomizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_can_toggle_b2b_supply_hub_for_premium_tier(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $premiumSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        // Baseline: Premium seller cannot access Supply Hub
        $this->actingAs($premiumSeller)
            ->get(route('seller.supply-hub.index'))
            ->assertForbidden();

        // Super Admin enables b2b_supply_hub for Premium tier
        $planService = app(SubscriptionPlanService::class);
        $premiumModules = $planService->getTierModules('premium');
        $premiumModules['b2b_supply_hub'] = true;

        $response = $this->actingAs($admin)
            ->post(route('admin.settings.update'), [
                'convenience_fee' => 3.0,
                'maintenance_mode' => false,
                'paymongo_enabled' => true,
                'contact_info' => ['email' => 'admin@test.com'],
                'social_links' => ['facebook' => null, 'instagram' => null, 'twitter' => null],
                'tier_premium_modules' => $premiumModules,
            ]);

        $response->assertSessionHasNoErrors();

        // Now Premium seller can access Supply Hub
        $this->actingAs($premiumSeller)
            ->get(route('seller.supply-hub.index'))
            ->assertOk();
    }

    public function test_super_admin_can_disable_b2b_supply_hub_for_elite_tier(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $eliteSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'super_premium',
        ]);

        // Baseline: Elite seller can access Supply Hub
        $this->actingAs($eliteSeller)
            ->get(route('seller.supply-hub.index'))
            ->assertOk();

        // Super Admin disables b2b_supply_hub for Elite tier
        $planService = app(SubscriptionPlanService::class);
        $eliteModules = $planService->getTierModules('super_premium');
        $eliteModules['b2b_supply_hub'] = false;

        $response = $this->actingAs($admin)
            ->post(route('admin.settings.update'), [
                'convenience_fee' => 3.0,
                'maintenance_mode' => false,
                'paymongo_enabled' => true,
                'contact_info' => ['email' => 'admin@test.com'],
                'social_links' => ['facebook' => null, 'instagram' => null, 'twitter' => null],
                'tier_super_premium_modules' => $eliteModules,
            ]);

        $response->assertSessionHasNoErrors();

        // Now Elite seller is blocked
        $this->actingAs($eliteSeller)
            ->get(route('seller.supply-hub.index'))
            ->assertForbidden();
    }

    public function test_super_admin_can_disable_in_house_dispatch_for_premium_tier(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $premiumSeller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $order = Order::create([
            'order_number' => 'ORD-DISPATCH-001',
            'user_id' => $premiumSeller->id,
            'artisan_id' => $premiumSeller->id,
            'status' => 'Processing',
            'total_amount' => 500.00,
            'shipping_method' => 'Delivery',
            'payment_status' => 'paid',
            'payment_method' => 'Cash on Delivery',
            'shipping_address' => '123 Test St, Cavite',
            'customer_name' => 'Test Customer',
        ]);

        // Super Admin disables in_house_dispatch for Premium tier
        $planService = app(SubscriptionPlanService::class);
        $premiumModules = $planService->getTierModules('premium');
        $premiumModules['in_house_dispatch'] = false;

        $this->actingAs($admin)
            ->post(route('admin.settings.update'), [
                'convenience_fee' => 3.0,
                'maintenance_mode' => false,
                'paymongo_enabled' => true,
                'contact_info' => ['email' => 'admin@test.com'],
                'social_links' => ['facebook' => null, 'instagram' => null, 'twitter' => null],
                'tier_premium_modules' => $premiumModules,
            ])
            ->assertSessionHasNoErrors();

        $this->actingAs($premiumSeller)
            ->post(route('orders.dispatch-in-house', $order->order_number), [
                'employee_id' => 999,
            ])
            ->assertForbidden();
    }

    public function test_custom_feature_labels_and_perks_persist_and_compile(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $planService = app(SubscriptionPlanService::class);

        $premiumModules = $planService->getTierModules('premium');
        $premiumLabels = [
            'in_house_dispatch' => 'Express Local Studio Couriers',
            'material_recipes' => 'Advanced Clay & Glaze Recipe Lab',
        ];
        $customFeatures = [
            'Dedicated account manager',
            'Priority phone support',
        ];

        $this->actingAs($admin)
            ->post(route('admin.settings.update'), [
                'convenience_fee' => 3.0,
                'maintenance_mode' => false,
                'paymongo_enabled' => true,
                'contact_info' => ['email' => 'admin@test.com'],
                'social_links' => ['facebook' => null, 'instagram' => null, 'twitter' => null],
                'tier_premium_modules' => $premiumModules,
                'tier_premium_feature_labels' => $premiumLabels,
                'tier_premium_custom_features' => $customFeatures,
            ])
            ->assertSessionHasNoErrors();

        $compiled = $planService->getTierFeaturesList('premium');

        $this->assertContains('Express Local Studio Couriers', $compiled);
        $this->assertContains('Advanced Clay & Glaze Recipe Lab', $compiled);
        $this->assertContains('Dedicated account manager', $compiled);
        $this->assertContains('Priority phone support', $compiled);
    }
}
