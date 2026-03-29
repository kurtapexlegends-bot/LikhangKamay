<?php

namespace Tests\Feature\Staff;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StaffDashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_hr_staff_lands_on_hr_hub(): void
    {
        $owner = $this->createPremiumOwner(['hr' => true]);
        $staff = $this->createStaff($owner, 'hr');

        $this->actingAs($staff)
            ->get(route('staff.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Staff/Dashboard')
                ->where('hub.variant', 'hr')
                ->where('hub.title', 'HR Hub')
                ->where('hub.visibleModules', function ($modules) {
                    $modules = $modules instanceof Collection ? $modules->all() : $modules;

                    return in_array('hr', $modules, true)
                        && in_array('team_messages', $modules, true)
                        && !in_array('accounting', $modules, true);
                })
            );
    }

    public function test_accounting_staff_lands_on_accounting_hub(): void
    {
        $owner = $this->createPremiumOwner(['accounting' => true]);
        $staff = $this->createStaff($owner, 'accounting');

        $this->actingAs($staff)
            ->get(route('staff.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Staff/Dashboard')
                ->where('hub.variant', 'accounting')
                ->where('hub.cards.0.routeName', 'accounting.index')
            );
    }

    public function test_procurement_staff_lands_on_procurement_hub(): void
    {
        $owner = $this->createPremiumOwner(['procurement' => true]);
        $staff = $this->createStaff($owner, 'procurement');

        $this->actingAs($staff)
            ->get(route('staff.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Staff/Dashboard')
                ->where('hub.variant', 'procurement')
                ->where('hub.cards', function ($cards) {
                    $cards = $cards instanceof Collection ? $cards->all() : $cards;
                    $routeNames = collect($cards)->pluck('routeName')->all();

                    return in_array('procurement.index', $routeNames, true)
                        && in_array('stock-requests.index', $routeNames, true)
                        && in_array('team-messages.index', $routeNames, true);
                })
            );
    }

    public function test_customer_support_staff_lands_on_crm_hub(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = $this->createStaff($owner, 'customer_support');

        $this->actingAs($staff)
            ->get(route('staff.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Staff/Dashboard')
                ->where('hub.variant', 'crm')
                ->where('hub.focus', 'Customer Support')
            );
    }

    public function test_custom_staff_hub_only_surfaces_granted_modules_plus_team_inbox(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = $this->createStaff($owner, 'custom', [
            'products' => true,
            'analytics' => true,
        ]);

        $this->actingAs($staff)
            ->get(route('staff.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Staff/Dashboard')
                ->where('hub.variant', 'crm')
                ->where('hub.cards', function ($cards) {
                    $cards = $cards instanceof Collection ? $cards->all() : $cards;
                    $routeNames = collect($cards)->pluck('routeName')->all();

                    return in_array('products.index', $routeNames, true)
                        && in_array('analytics.index', $routeNames, true)
                        && in_array('team-messages.index', $routeNames, true)
                        && !in_array('orders.index', $routeNames, true);
                })
            );
    }

    private function createPremiumOwner(array $modulesEnabled = []): User
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $owner->modules_enabled = [
            'hr' => (bool) ($modulesEnabled['hr'] ?? false),
            'accounting' => (bool) ($modulesEnabled['accounting'] ?? false),
            'procurement' => true,
        ];
        $owner->save();

        return $owner;
    }

    private function createStaff(User $owner, string $presetKey, array $permissions = []): User
    {
        return User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => $presetKey,
            'staff_module_permissions' => $permissions,
        ]);
    }
}
