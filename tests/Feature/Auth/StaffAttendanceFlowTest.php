<?php

namespace Tests\Feature\Auth;

use App\Models\Employee;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\StaffAttendanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
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

    public function test_staff_login_lands_on_workspace_without_creating_an_attendance_session(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        $response = $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ]);

        $response->assertRedirect(route('staff.dashboard', absolute: false));
        $this->assertAuthenticatedAs($staff);
        $this->assertSame(0, StaffAttendanceSession::where('staff_user_id', $staff->id)->count());
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

    public function test_staff_logout_confirm_screen_redirects_workspace_users_back_to_staff_dashboard(): void
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

        $response->assertRedirect(route('staff.dashboard'));
    }

    public function test_staff_can_take_break_without_logging_out_and_resume_work_with_a_new_same_day_session(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(8, 0));
        $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ])->assertRedirect(route('staff.dashboard', absolute: false));

        $this->actingAs($staff)->post(route('staff.attendance.resume'))
            ->assertRedirect(route('staff.dashboard'));

        $openSession = StaffAttendanceSession::where('staff_user_id', $staff->id)->latest('clock_in_at')->firstOrFail();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(10, 0));
        $this->actingAs($staff)->post(route('staff.attendance.break'))
            ->assertRedirect(route('staff.dashboard'));

        $this->assertAuthenticatedAs($staff);
        $openSession->refresh();
        $this->assertSame('paused', $openSession->close_mode);
        $this->assertNotNull($openSession->clock_out_at);
        $this->assertSame(120, $openSession->worked_minutes);

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(11, 0));
        $this->actingAs($staff)->post(route('staff.attendance.resume'))
            ->assertRedirect(route('staff.dashboard'));

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

    public function test_logout_context_uses_first_clock_in_and_total_active_time_for_the_day(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(8, 0));
        $firstClockIn = now(config('app.timezone'));

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => $firstClockIn,
            'clock_out_at' => $firstClockIn->copy()->addHours(2),
            'close_mode' => StaffAttendanceService::MODE_PAUSED,
            'close_reason' => StaffAttendanceService::CLOSE_REASON_MANUAL_PAUSE,
            'worked_minutes' => 120,
        ]);

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(11, 0));
        $secondClockIn = now(config('app.timezone'));

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => $secondClockIn,
            'last_heartbeat_at' => $secondClockIn,
            'worked_minutes' => 0,
        ]);

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(12, 30));

        $context = app(StaffAttendanceService::class)->buildLogoutContext($staff);

        $this->assertTrue($context['has_open_session']);
        $this->assertSame('clocked_in', $context['current_state']);
        $this->assertSame($firstClockIn->toIso8601String(), $context['today_first_clock_in']);
        $this->assertSame(210, $context['today_worked_minutes']);
        $this->assertSame(120 * 60, $context['today_worked_seconds_base']);
        $this->assertSame($secondClockIn->toIso8601String(), $context['active_session_started_at']);
    }

    public function test_staff_can_clock_out_and_close_the_current_attendance_session(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(9, 0));
        $this->post('/login', [
            'email' => $staff->email,
            'password' => 'password',
        ])->assertRedirect(route('staff.dashboard', absolute: false));

        $this->actingAs($staff)->post(route('staff.attendance.resume'))
            ->assertRedirect(route('staff.dashboard'));

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

    public function test_staff_heartbeat_updates_the_open_attendance_session(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(9, 0));

        $session = StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone'))->subMinutes(9),
            'worked_minutes' => 0,
        ]);

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(9, 9));

        $this->actingAs($staff)
            ->post(route('staff.attendance.heartbeat'))
            ->assertOk()
            ->assertJson([
                'ok' => true,
                'active' => true,
            ]);

        $session->refresh();
        $this->assertSame(now(config('app.timezone'))->toIso8601String(), $session->last_heartbeat_at?->toIso8601String());
        $this->assertNull($session->clock_out_at);
    }

    public function test_auto_pause_command_closes_only_stale_open_sessions(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(8, 0));

        $staleSession = StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHours(2),
            'last_heartbeat_at' => now(config('app.timezone'))->subMinutes(15),
            'worked_minutes' => 0,
        ]);

        $freshSession = StaffAttendanceSession::create([
            'staff_user_id' => User::factory()->staff($owner)->create([
                'email_verified_at' => now(config('app.timezone')),
                'must_change_password' => false,
                'employee_id' => $employee->id,
                'staff_role_preset_key' => 'custom',
                'staff_module_permissions' => User::withWorkspaceAccessFlag([], true),
            ])->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHour(),
            'last_heartbeat_at' => now(config('app.timezone'))->copy()->setTime(8, 12),
            'worked_minutes' => 0,
        ]);

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(8, 15));

        Artisan::call('staff:auto-pause-inactive');

        $staleSession->refresh();
        $freshSession->refresh();

        $this->assertSame(StaffAttendanceService::MODE_PAUSED, $staleSession->close_mode);
        $this->assertSame(StaffAttendanceService::CLOSE_REASON_INACTIVITY_TIMEOUT, $staleSession->close_reason);
        $this->assertNotNull($staleSession->clock_out_at);
        $this->assertNull($freshSession->clock_out_at);
    }

    public function test_timed_out_staff_is_redirected_to_resume_prompt_on_next_module_request(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHours(3),
            'clock_out_at' => now(config('app.timezone'))->subMinutes(1),
            'last_heartbeat_at' => now(config('app.timezone'))->subMinutes(11),
            'close_mode' => StaffAttendanceService::MODE_PAUSED,
            'close_reason' => StaffAttendanceService::CLOSE_REASON_INACTIVITY_TIMEOUT,
            'worked_minutes' => 170,
        ]);

        $this->actingAs($staff)
            ->get(route('team-messages.index'))
            ->assertRedirect(route('staff.attendance.resume-prompt'));
    }

    public function test_heartbeat_returns_locked_prompt_payload_after_inactivity_timeout(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHours(3),
            'clock_out_at' => now(config('app.timezone'))->subMinutes(2),
            'last_heartbeat_at' => now(config('app.timezone'))->subMinutes(12),
            'close_mode' => StaffAttendanceService::MODE_PAUSED,
            'close_reason' => StaffAttendanceService::CLOSE_REASON_INACTIVITY_TIMEOUT,
            'worked_minutes' => 178,
        ]);

        $this->actingAs($staff)
            ->postJson(route('staff.attendance.heartbeat'))
            ->assertStatus(423)
            ->assertJson([
                'requires_resume' => true,
                'resume_prompt' => [
                    'close_reason' => StaffAttendanceService::CLOSE_REASON_INACTIVITY_TIMEOUT,
                    'worked_minutes' => 178,
                ],
            ]);
    }

    public function test_resume_prompt_page_renders_timeout_context(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHours(2),
            'clock_out_at' => now(config('app.timezone'))->subMinutes(3),
            'last_heartbeat_at' => now(config('app.timezone'))->subMinutes(13),
            'close_mode' => StaffAttendanceService::MODE_PAUSED,
            'close_reason' => StaffAttendanceService::CLOSE_REASON_INACTIVITY_TIMEOUT,
            'worked_minutes' => 120,
        ]);

        $this->actingAs($staff)
            ->get(route('staff.attendance.resume-prompt'))
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Auth/StaffResumePrompt')
                ->where('resumePrompt.requires_resume', true)
                ->where('resumePrompt.close_reason', StaffAttendanceService::CLOSE_REASON_INACTIVITY_TIMEOUT)
                ->where('resumePrompt.worked_minutes', 120)
            );
    }

    public function test_resume_time_starts_a_new_session_and_redirects_back_to_workspace(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        Carbon::setTestNow(now(config('app.timezone'))->startOfDay()->setTime(9, 0));

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHours(2),
            'clock_out_at' => now(config('app.timezone'))->subMinutes(1),
            'last_heartbeat_at' => now(config('app.timezone'))->subMinutes(11),
            'close_mode' => StaffAttendanceService::MODE_PAUSED,
            'close_reason' => StaffAttendanceService::CLOSE_REASON_INACTIVITY_TIMEOUT,
            'worked_minutes' => 119,
        ]);

        $response = $this->actingAs($staff)
            ->withSession(['staff.attendance.intended' => route('team-messages.index')])
            ->post(route('staff.attendance.resume'));

        $response->assertRedirect(route('team-messages.index'));

        $this->assertSame(
            1,
            StaffAttendanceSession::where('staff_user_id', $staff->id)
                ->whereNull('clock_out_at')
                ->count()
        );

        $openSession = StaffAttendanceSession::where('staff_user_id', $staff->id)
            ->whereNull('clock_out_at')
            ->latest('clock_in_at')
            ->firstOrFail();

        $this->assertSame(now(config('app.timezone'))->toDateString(), $openSession->attendance_date->toDateString());
        $this->assertNotNull($openSession->last_heartbeat_at);
    }

    public function test_direct_logout_route_signs_staff_out_without_reopening_attendance(): void
    {
        [$owner, $employee, $staff] = $this->createVerifiedStaffWithEmployee();

        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => now(config('app.timezone'))->toDateString(),
            'clock_in_at' => now(config('app.timezone'))->subHours(2),
            'clock_out_at' => now(config('app.timezone'))->subMinutes(1),
            'last_heartbeat_at' => now(config('app.timezone'))->subMinutes(11),
            'close_mode' => StaffAttendanceService::MODE_PAUSED,
            'close_reason' => StaffAttendanceService::CLOSE_REASON_INACTIVITY_TIMEOUT,
            'worked_minutes' => 119,
        ]);

        $this->actingAs($staff)
            ->post(route('staff.logout.direct'))
            ->assertRedirect('/');

        $this->assertGuest();
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
