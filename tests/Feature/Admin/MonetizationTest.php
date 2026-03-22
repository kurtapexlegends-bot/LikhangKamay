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

    public function test_monetization_marks_plan_mrr_as_projected(): void
    {
        $admin = User::factory()->superAdmin()->create();
        User::factory()->artisanApproved()->create(['premium_tier' => 'premium']);
        User::factory()->artisanApproved()->create(['premium_tier' => 'super_premium']);

        $this->actingAs($admin)
            ->get(route('admin.monetization'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Monetization')
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
            ->get(route('admin.monetization'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Monetization')
                ->where('recentSubscribers.0.id', $log->id)
                ->where('recentSubscribers.0.user_id', $artisan->id)
                ->where('recentSubscribers.0.name', 'Cavite Potter')
                ->where('recentSubscribers.0.shop_name', 'Cavite Clay House')
                ->where('recentSubscribers.0.previous_tier', 'free')
                ->where('recentSubscribers.0.tier', 'Premium')
            );
    }
}
