<?php

namespace Tests\Feature;

use App\Models\Employee;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class Phase5AuditRegressionTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_staff_cannot_bypass_logout_choice_through_generic_logout_endpoint(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'worked_minutes' => 0,
        ]);

        $this->actingAs($staff)
            ->post(route('logout'))
            ->assertRedirect(route('staff.logout.confirm', absolute: false));

        $this->assertAuthenticatedAs($staff);
        $this->assertSame(
            1,
            StaffAttendanceSession::where('staff_user_id', $staff->id)
                ->whereNull('clock_out_at')
                ->count()
        );
    }

    public function test_hr_attendance_summary_includes_todays_first_clock_in_timestamp(): void
    {
        Carbon::setTestNow(Carbon::create(2026, 3, 29, 9, 0, 0, config('app.timezone')));

        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);

        $owner->modules_enabled = [
            'hr' => true,
            'accounting' => false,
            'procurement' => true,
        ];
        $owner->save();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Today Clock In Staff',
            'role' => 'HR Assistant',
            'salary' => 16000,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonth(),
        ]);

        $staff = User::factory()->staff($owner)->create([
            'name' => $employee->name,
            'email_verified_at' => now(config('app.timezone')),
            'must_change_password' => false,
            'employee_id' => $employee->id,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        $clockIn = Carbon::create(2026, 3, 29, 8, 15, 0, config('app.timezone'));

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => $clockIn->toDateString(),
            'clock_in_at' => $clockIn,
            'worked_minutes' => 0,
        ]);

        $this->actingAs($owner)
            ->get(route('hr.index'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Seller/HR')
                ->where('staff.0.attendance.today_first_clock_in', $clockIn->toIso8601String())
                ->where('staff.0.attendance.current_state', 'clocked_in')
            );
    }

    /**
     * @return array{0: \App\Models\User, 1: \App\Models\Employee, 2: \App\Models\User}
     */
    private function createVerifiedStaffWithEmployee(): array
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
        ]);
        $owner->modules_enabled = [
            'hr' => true,
            'accounting' => false,
            'procurement' => false,
        ];
        $owner->save();
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Audit Staff',
            'role' => 'HR Coordinator',
            'salary' => 18000,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonth(),
        ]);

        $staff = User::factory()->staff($owner)->create([
            'name' => $employee->name,
            'email_verified_at' => now(config('app.timezone')),
            'must_change_password' => false,
            'employee_id' => $employee->id,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        return [$owner, $employee, $staff];
    }
}
