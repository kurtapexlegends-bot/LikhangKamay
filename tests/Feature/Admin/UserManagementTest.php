<?php

namespace Tests\Feature\Admin;

use App\Models\Employee;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_users_page_nests_staff_under_artisan_rows(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->artisanApproved()->create([
            'name' => 'Kurt Shop Owner',
            'shop_name' => "Kurt's Shop",
        ]);

        $employee = $this->createEmployee($owner, 'Andrea Staff');

        $staff = User::factory()->staff($owner)->create([
            'name' => 'Andrea Staff',
            'email_verified_at' => now(),
            'must_change_password' => true,
            'employee_id' => $employee->id,
        ]);

        $this->actingAs($admin)
            ->get(route('admin.users'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users')
                ->where('users.data', function ($users) use ($owner, $staff, $employee) {
                    $topLevelIds = collect($users)->pluck('id');
                    $ownerRow = collect($users)->firstWhere('id', $owner->id);
                    $nestedStaff = collect($ownerRow['staff_members'] ?? [])->firstWhere('id', $staff->id);

                    return $topLevelIds->contains($owner->id)
                        && !$topLevelIds->contains($staff->id)
                        && $ownerRow !== null
                        && $ownerRow['role'] === 'artisan'
                        && $ownerRow['staff_count'] === 1
                        && $ownerRow['matched_staff_count'] === 0
                        && $nestedStaff !== null
                        && $nestedStaff['employee_name'] === $employee->name
                        && $nestedStaff['employee_linked'] === true
                        && $nestedStaff['email_verified'] === true
                        && $nestedStaff['requires_password_change'] === true
                        && $nestedStaff['account_state'] === 'Password Reset Required';
                })
            );
    }

    public function test_legacy_staff_filter_is_normalized_to_artisan_rows(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->artisanApproved()->create();
        $staff = User::factory()->staff($owner)->create();
        User::factory()->create();
        User::factory()->artisanApproved()->create();

        $this->actingAs($admin)
            ->get(route('admin.users', ['role' => 'staff']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users')
                ->where('filters.role', 'artisan')
                ->where('users.data', function ($users) use ($owner, $staff) {
                    $roles = collect($users)->pluck('role')->unique()->values()->all();
                    $topLevelIds = collect($users)->pluck('id');
                    $ownerRow = collect($users)->firstWhere('id', $owner->id);

                    return $topLevelIds->contains($owner->id)
                        && !$topLevelIds->contains($staff->id)
                        && $roles === ['artisan']
                        && $ownerRow !== null
                        && $ownerRow['staff_count'] === 1;
                })
            );
    }

    public function test_super_admin_can_filter_super_admin_accounts(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $otherAdmin = User::factory()->superAdmin()->create();
        User::factory()->create();

        $this->actingAs($admin)
            ->get(route('admin.users', ['role' => 'super_admin']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users')
                ->where('filters.role', 'super_admin')
                ->where('users.data', function ($users) use ($admin, $otherAdmin) {
                    $ids = collect($users)->pluck('id')->sort()->values()->all();
                    $roles = collect($users)->pluck('role')->unique()->values()->all();

                    return $ids === collect([$admin->id, $otherAdmin->id])->sort()->values()->all()
                        && $roles === ['super_admin']
                        && collect($users)->every(fn ($user) => ($user['staff_count'] ?? 0) === 0);
                })
            );
    }

    public function test_super_admin_can_filter_buyer_accounts_as_flat_primary_rows(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $buyer = User::factory()->create(['role' => 'buyer']);
        $secondBuyer = User::factory()->create(['role' => 'buyer']);
        User::factory()->artisanApproved()->create();

        $this->actingAs($admin)
            ->get(route('admin.users', ['role' => 'buyer']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users')
                ->where('filters.role', 'buyer')
                ->where('users.data', function ($users) use ($buyer, $secondBuyer) {
                    $ids = collect($users)->pluck('id')->sort()->values()->all();
                    $roles = collect($users)->pluck('role')->unique()->sort()->values()->all();

                    return $ids === collect([$buyer->id, $secondBuyer->id])->sort()->values()->all()
                        && $roles === ['buyer']
                        && collect($users)->every(fn ($user) => empty($user['staff_members']));
                })
            );
    }

    public function test_super_admin_can_search_staff_by_linked_seller_shop_name(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->artisanApproved()->create([
            'shop_name' => 'Heritage Clay House',
        ]);

        $staff = User::factory()->staff($owner)->create([
            'name' => 'Andrea Staff',
        ]);

        $otherOwner = User::factory()->artisanApproved()->create([
            'shop_name' => 'Stonecraft Studio',
        ]);
        User::factory()->staff($otherOwner)->create();

        $this->actingAs($admin)
            ->get(route('admin.users', ['search' => 'Heritage Clay']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users')
                ->where('filters.role', 'all')
                ->where('filters.search', 'Heritage Clay')
                ->where('users.data', function ($users) use ($owner, $staff) {
                    $topLevelIds = collect($users)->pluck('id');
                    $ownerRow = collect($users)->firstWhere('id', $owner->id);

                    return count($users) === 1
                        && $topLevelIds->contains($owner->id)
                        && !$topLevelIds->contains($staff->id)
                        && $ownerRow !== null
                        && $ownerRow['staff_count'] === 1
                        && $ownerRow['matched_staff_count'] === 0
                        && count($ownerRow['staff_members']) === 1;
                })
            );
    }

    public function test_super_admin_can_search_staff_by_name_and_return_only_matching_nested_staff(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->artisanApproved()->create([
            'shop_name' => 'Heritage Clay House',
        ]);

        $matchingStaff = User::factory()->staff($owner)->create([
            'name' => 'Alice Ledger',
        ]);
        $otherStaff = User::factory()->staff($owner)->create([
            'name' => 'Brian Support',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.users', ['role' => 'artisan', 'search' => 'Alice Ledger']))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users')
                ->where('filters.role', 'artisan')
                ->where('filters.search', 'Alice Ledger')
                ->where('users.data', function ($users) use ($owner, $matchingStaff, $otherStaff) {
                    $ownerRow = collect($users)->firstWhere('id', $owner->id);
                    $visibleNestedIds = collect($ownerRow['staff_members'] ?? [])->pluck('id');
                    $topLevelIds = collect($users)->pluck('id');

                    return count($users) === 1
                        && $topLevelIds->contains($owner->id)
                        && !$topLevelIds->contains($matchingStaff->id)
                        && $ownerRow !== null
                        && $ownerRow['staff_count'] === 2
                        && $ownerRow['matched_staff_count'] === 1
                        && $visibleNestedIds->contains($matchingStaff->id)
                        && !$visibleNestedIds->contains($otherStaff->id)
                        && $visibleNestedIds->count() === 1;
                })
            );
    }

    public function test_super_admin_surfaces_unlinked_staff_group_for_orphaned_staff_accounts(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $orphanedStaff = User::factory()->staff()->create([
            'name' => 'Detached Staff',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.users'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Users')
                ->where('unlinkedStaffGroup.staff_count', 1)
                ->where('unlinkedStaffGroup.staff_members', function ($staffMembers) use ($orphanedStaff) {
                    return count($staffMembers) === 1
                        && collect($staffMembers)->pluck('id')->contains($orphanedStaff->id);
                })
            );
    }

    private function createEmployee(User $owner, string $name): Employee
    {
        return Employee::create([
            'user_id' => $owner->id,
            'name' => $name,
            'role' => 'Accounting',
            'salary' => 15000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
        ]);
    }
}
