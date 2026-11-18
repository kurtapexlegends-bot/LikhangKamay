<?php

namespace Tests\Feature\Admin;

use App\Models\Order;
use App\Models\User;
use App\Models\UserTierLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MonetizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_monetization_route_renders_dedicated_dashboard(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->get(route('admin.monetization'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Monetization/Monetization')
                ->has('metrics')
                ->has('recentSubscribers')
            );
    }

    public function test_legacy_settings_monetization_tab_redirects_to_dedicated_route(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->get(route('admin.settings.index', ['tab' => 'monetization']))
            ->assertRedirect(route('admin.monetization'));
    }

    public function test_subscriptions_alias_redirects_to_monetization_route(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->get(route('admin.subscriptions'))
            ->assertRedirect(route('admin.monetization'));
    }

    public function test_monetization_marks_plan_mrr_as_projected(): void
    {
        $admin = User::factory()->superAdmin()->create();
        User::factory()->artisanApproved()->create(['premium_tier' => 'premium']);
        User::factory()->artisanApproved()->create(['premium_tier' => 'super_premium']);

        $expectedMrr = (int) (\App\Facades\Settings::get('tier_premium_price', 699) + \App\Facades\Settings::get('tier_super_premium_price', 1299));

        $this->actingAs($admin)
            ->get(route('admin.monetization'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Monetization/Monetization')
                ->where('metrics.mrr.value', $expectedMrr)
                ->where('metrics.mrr.is_projected', true)
                ->where('metrics.mrr.basis', 'Based on current active artisan plan tiers.')
            );
    }

    public function test_monetization_uses_tier_logs_for_recent_plan_changes(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $artisan = User::factory()->artisanApproved()->create([
            'name' => 'Cavite Potter',
            'shop_name' => 'Cavite Clay House',
            'premium_tier' => 'premium',
        ]);

        $log = UserTierLog::create([
            'user_id' => $artisan->id,
            'previous_tier' => 'free',
            'new_tier' => 'premium',
            'created_at' => now()->subHour(),
            'updated_at' => now()->subHour(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.monetization'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Monetization/Monetization')
                ->where('recentSubscribers.0.id', $log->id)
                ->where('recentSubscribers.0.user_id', $artisan->id)
                ->where('recentSubscribers.0.name', 'Cavite Potter')
                ->where('recentSubscribers.0.shop_name', 'Cavite Clay House')
                ->where('recentSubscribers.0.previous_tier', 'free')
                ->where('recentSubscribers.0.tier', 'Premium')
            );
    }

    public function test_admin_can_export_insights_csv(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)
            ->get(route('admin.insights.export'))
            ->assertOk();

        $response->assertHeader('Content-Type', 'text/csv; charset=utf-8');
        $response->assertHeader('Content-Disposition', 'attachment; filename="insights_report.csv"');
        $this->assertStringContainsString('PLATFORM OVERVIEW METRICS', $response->streamedContent());
    }

    public function test_transaction_fees_report_only_paid_orders_on_dashboard_and_csv(): void
    {
        $this->freezeTime();
        $admin = User::factory()->superAdmin()->create();
        $buyer = User::factory()->create();
        $artisan = User::factory()->artisanApproved()->create();

        foreach ([
            [1, 'paid', Order::STATUS_ACCEPTED, 20.50, false],
            [31, 'paid', Order::STATUS_COMPLETED, 10.25, false],
            [75, 'paid', Order::STATUS_COMPLETED, 5.00, false],
            [2, 'pending', Order::STATUS_ACCEPTED, 80.00, false],
            [35, 'pending', Order::STATUS_ACCEPTED, 80.00, false],
            [3, 'paid', Order::STATUS_CANCELLED, 80.00, false],
            [4, 'refunded', Order::STATUS_REFUNDED, 80.00, false],
            [5, 'partially_refunded', Order::STATUS_COMPLETED, 80.00, false],
            [6, 'paid', Order::STATUS_COMPLETED, 80.00, true],
        ] as $index => [$age, $paymentStatus, $status, $fee, $isTest]) {
            $order = Order::create([
                'order_number' => 'ORD-REPORT-' . $index,
                'user_id' => $buyer->id,
                'artisan_id' => $artisan->id,
                'customer_name' => $buyer->name,
                'status' => $status,
                'payment_status' => $paymentStatus,
                'payment_method' => 'GCash',
                'merchandise_subtotal' => 500,
                'seller_net_amount' => 500,
                'total_amount' => 500 + $fee,
                'convenience_fee_amount' => $fee,
                'shipping_method' => 'Delivery',
                'shipping_address' => 'Cavite',
                'is_test' => $isTest,
            ]);
            $order->created_at = now()->subDays($age);
            $order->save();
        }

        $this->actingAs($admin)->get(route('admin.monetization'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->where('metrics.platform_fees.value', 35.75)
                ->where('metrics.platform_fees.growth', 100)
            );

        $csv = $this->get(route('admin.settings.monetization.export'))->assertOk()->streamedContent();
        $this->assertStringContainsString('"Transaction Fees Collected","PHP 35.75"', $csv);
    }

    public function test_admin_can_export_monetization_csv(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $response = $this->actingAs($admin)
            ->get(route('admin.settings.monetization.export'))
            ->assertOk();

        $response->assertHeader('Content-Type', 'text/csv; charset=utf-8');
        $response->assertHeader('Content-Disposition', 'attachment; filename="monetization_report.csv"');
        $this->assertStringContainsString('MONETIZATION OVERVIEW METRICS', $response->streamedContent());
    }

    public function test_non_admin_cannot_export_insights_or_monetization_csv(): void
    {
        $buyer = User::factory()->create();

        $this->actingAs($buyer)
            ->get(route('admin.insights.export'))
            ->assertStatus(403);

        $this->actingAs($buyer)
            ->get(route('admin.settings.monetization.export'))
            ->assertStatus(403);
    }
}

