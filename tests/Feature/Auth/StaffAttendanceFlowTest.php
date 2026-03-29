<?php

namespace Tests\Feature\Auth;

use App\Models\Employee;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StaffAttendanceFlowTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();

        parent::tearDown();
    }

    public function test_staff_login_creates_an_attendance_session_automatically(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        $response = $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ]);

        $response->assertRedirect(route('staff.dashboard', absolute: false));
        $this->assertAuthenticatedAs($staff);
        $this->assertDatabaseHas('staff_attendance_sessions', [
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'close_mode' => null,
        ]);
        $this->assertSame(1, StaffAttendanceSession::where('staff_user_id', $staff->id)->count());
    }

    public function test_staff_login_does_not_create_a_duplicate_open_attendance_session(): void
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

        $response = $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ]);

        $response->assertRedirect(route('staff.dashboard', absolute: false));
        $this->assertSame(1, StaffAttendanceSession::where('staff_user_id', $staff->id)->count());
        $this->assertSame(
            1,
            StaffAttendanceSession::where('staff_user_id', $staff->id)
                ->whereNull('clock_out_at')
                ->count()
        );
    }

    public function test_staff_logout_confirm_screen_shows_current_attendance_context(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subMinutes(45),
            'worked_minutes' => 0,
        ]);

        $response = $this->actingAs($staff)->get(route('staff.logout.confirm'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Auth/StaffLogoutChoice')
            ->where('attendance.has_open_session', true)
            ->where('attendance.attendance_date', now(config('app.timezone'))->toDateString())
        );
    }

    public function test_staff_can_pause_time_and_next_login_creates_a_new_same_day_session(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(8, 0));
        $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ])->assertRedirect(route('staff.dashboard', absolute: false));

        $openSession = StaffAttendanceSession::where('staff_user_id', $staff->id)->latest('clock_in_at')->firstOrFail();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(10, 0));
        $this->actingAs($staff)->post(route('staff.logout'), [
            'action' => 'pause',
        ])->assertRedirect('/');

        $this->assertGuest();
        $openSession->refresh();
        $this->assertSame('paused', $openSession->close_mode);
        $this->assertNotNull($openSession->clock_out_at);
        $this->assertSame(120, $openSession->worked_minutes);

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(11, 0));
        $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ])->assertRedirect(route('staff.dashboard', absolute: false));

        $this->assertSame(2, StaffAttendanceSession::where('staff_user_id', $staff->id)->count());
        $this->assertSame(
            1,
            StaffAttendanceSession::where('staff_user_id', $staff->id)
                ->whereNull('clock_out_at')
                ->count()
        );
        $newSession = StaffAttendanceSession::where('staff_user_id', $staff->id)
            ->whereNull('clock_out_at')
            ->latest('clock_in_at')
            ->firstOrFail();

        $this->assertSame($owner->id, $newSession->seller_owner_id);
        $this->assertSame($employee->id, $newSession->employee_id);
        $this->assertSame(now(config('app.timezone'))->toDateString(), $newSession->attendance_date->toDateString());
    }

    public function test_staff_can_clock_out_and_close_the_current_attendance_session(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(9, 0));
        $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ])->assertRedirect(route('staff.dashboard', absolute: false));

        $openSession = StaffAttendanceSession::where('staff_user_id', $staff->id)->latest('clock_in_at')->firstOrFail();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(17, 30));
        $this->actingAs($staff)->post(route('staff.logout'), [
            'action' => 'clock_out',
        ])->assertRedirect('/');

        $this->assertGuest();
        $openSession->refresh();
        $this->assertSame('clocked_out', $openSession->close_mode);
        $this->assertNotNull($openSession->clock_out_at);
        $this->assertSame(510, $openSession->worked_minutes);
        $this->assertSame(
            0,
            StaffAttendanceSession::where('staff_user_id', $staff->id)
                ->whereNull('clock_out_at')
                ->count()
        );
    }

    /**
     * @return array{0: \App\Models\User, 1: \App\Models\Employee, 2: \App\Models\User}
     */
    private function createVerifiedStaffWithEmployee(): array
    {
        $owner = User::factory()->artisanApproved()->create();
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Attendance Staff',
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
