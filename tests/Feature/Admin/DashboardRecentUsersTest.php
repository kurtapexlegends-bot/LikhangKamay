<?php

namespace Tests\Feature\Admin;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardRecentUsersTest extends TestCase
{
    use RefreshDatabase;

    public function test_super_admin_dashboard_marks_staff_accounts_as_staff_in_recent_registrations(): void
    {
        $admin = User::factory()->superAdmin()->create();
        $owner = User::factory()->artisanApproved()->create([
            'shop_name' => 'Heritage Clay House',
        ]);
        $staff = User::factory()->staff($owner)->create([
            'name' => 'Andrea Staff',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Admin/Dashboard')
                ->where('recentUsers', function ($recentUsers) use ($staff, $owner) {
                    $staffEntry = collect($recentUsers)->firstWhere('id', $staff->id);

                    return $staffEntry !== null
                        && $staffEntry['role'] === 'staff'
                        && $staffEntry['role_label'] === 'Staff'
                        && $staffEntry['account_state'] === 'Access Active'
                        && $staffEntry['seller_shop_name'] === $owner->shop_name;
                })
            );
    }
}
