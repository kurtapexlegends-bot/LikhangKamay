<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Collection;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class SellerEntitlementsTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_shared_entitlements_still_reflect_subscription_modules(): void
    {
        $owner = $this->createPremiumOwner([
            'hr' => true,
            'accounting' => true,
            'procurement' => true,
        ]);

        $response = $this->actingAs($owner)->get(route('dashboard'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('sellerSidebar.actorType', 'owner')
            ->where('sellerSidebar.showPlanPanel', true)
            ->where('sellerSubscription.showPlanPanel', true)
            ->where('sellerSidebar.canManageModuleSettings', true)
            ->where('sellerSidebar.visibleModules', function ($modules) {
                $modules = $modules instanceof Collection ? $modules->all() : $modules;

                return in_array('overview', $modules, true)
                    && in_array('hr', $modules, true)
                    && in_array('accounting', $modules, true)
                    && in_array('procurement', $modules, true)
                    && in_array('stock_requests', $modules, true);
            })
        );
    }

    public function test_hr_staff_can_access_hr_and_is_blocked_from_accounting(): void
    {
        $owner = $this->createPremiumOwner([
            'hr' => true,
            'accounting' => true,
            'procurement' => true,
        ]);
        $staff = $this->createCompletedStaff($owner, 'hr');

        $response = $this->actingAs($staff)->get(route('hr.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/HR')
            ->where('sellerSidebar.actorType', 'staff')
            ->where('sellerSidebar.showPlanPanel', false)
            ->where('sellerSubscription.showPlanPanel', false)
            ->where('sellerSidebar.rolePresetKey', 'hr')
            ->where('sellerSidebar.canManageModuleSettings', false)
            ->where('sellerSidebar.visibleModules', function ($modules) {
                $modules = $modules instanceof Collection ? $modules->all() : $modules;

                return $modules === ['hr'];
            })
        );

        $this->actingAs($staff)
            ->get(route('accounting.index'))
            ->assertForbidden();
    }

    public function test_staff_dashboard_redirects_to_first_accessible_module_when_overview_is_not_granted(): void
    {
        $owner = $this->createPremiumOwner([
            'hr' => true,
            'procurement' => true,
        ]);
        $staff = $this->createCompletedStaff($owner, 'hr');

        $this->actingAs($staff)
            ->get(route('dashboard'))
            ->assertRedirect(route('hr.index', absolute: false));
    }

    public function test_procurement_only_staff_cannot_view_payroll_data_or_hr_module(): void
    {
        $owner = $this->createPremiumOwner([
            'procurement' => true,
        ]);

        Employee::create([
            'user_id' => $owner->id,
            'name' => 'Procurement Test Employee',
            'role' => 'Potter',
            'salary' => 18000,
            'status' => 'Active',
            'join_date' => now(),
        ]);

        Payroll::create([
            'user_id' => $owner->id,
            'month' => now()->subMonth()->format('F Y'),
            'total_amount' => 9000,
            'employee_count' => 1,
            'status' => 'Paid',
        ]);

        $staff = $this->createCompletedStaff($owner, 'procurement');

        $response = $this->actingAs($staff)->get(route('procurement.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/Procurement/Index')
            ->where('finances.payroll_due', null)
            ->where('finances.transactions', [])
        );

        $this->actingAs($staff)
            ->get(route('hr.index'))
            ->assertForbidden();
    }

    public function test_orders_enabled_staff_can_access_orders_but_not_analytics(): void
    {
        $owner = User::factory()->artisanApproved()->create();
        $staff = $this->createCompletedStaff($owner, 'custom', [
            'orders' => true,
        ]);

        $this->actingAs($staff)
            ->get(route('orders.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page->component('Seller/OrderManager'));

        $this->actingAs($staff)
            ->get(route('analytics.index'))
            ->assertForbidden();
    }

    public function test_suspended_staff_keeps_the_linked_account_but_loses_workspace_access(): void
    {
        $owner = $this->createPremiumOwner([
            'hr' => true,
        ]);

        $staff = User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], false),
        ]);

        $this->actingAs($staff)
            ->get(route('dashboard'))
            ->assertRedirect(route('staff.home', absolute: false));

        $this->actingAs($staff)
            ->get(route('hr.index'))
            ->assertForbidden();

        $this->actingAs($staff)
            ->get(route('staff.home'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Staff/Holding')
                ->where('staffAccount.workspace_access_enabled', false)
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

    private function createCompletedStaff(User $owner, string $presetKey = 'custom', array $permissions = []): User
    {
        return User::factory()->staff($owner)->create([
            'email_verified_at' => now(),
            'must_change_password' => false,
            'staff_role_preset_key' => $presetKey,
            'staff_module_permissions' => $permissions,
        ]);
    }
}
