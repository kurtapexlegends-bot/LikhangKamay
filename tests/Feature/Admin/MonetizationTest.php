<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use App\Models\UserTierLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class MonetizationTest extends TestCase
{
    use RefreshDatabase;

    public function test_monetization_route_redirects_to_settings(): void
    {
        $admin = User::factory()->superAdmin()->create();

        $this->actingAs($admin)
            ->get(route('admin.monetization'))
            ->assertRedirect(route('admin.settings.index', ['tab' => 'monetization']));
    }

    public function test_monetization_marks_plan_mrr_as_projected(): void
    {
        $admin = User::factory()->superAdmin()->create();
        User::factory()->artisanApproved()->create(['premium_tier' => 'premium']);
        User::factory()->artisanApproved()->create(['premium_tier' => 'super_premium']);

        $this->actingAs($admin)
            ->get(route('admin.settings.index', ['tab' => 'monetization']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Layout/SystemConfig/SystemConfig')
                ->where('metrics.mrr.value', 598)
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
            ->get(route('admin.settings.index', ['tab' => 'monetization']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Layout/SystemConfig/SystemConfig')
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

