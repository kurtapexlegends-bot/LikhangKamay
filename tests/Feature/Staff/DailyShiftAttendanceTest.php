<?php

namespace Tests\Feature\Staff;

use App\Models\Employee;
use App\Models\User;
use App\Services\StaffAttendanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DailyShiftAttendanceTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_workshop_daily_shift_policy_resolves_different_hours_per_day(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'shift_schedule_mode' => 'per_day',
            'daily_shifts' => [
                'mon' => ['is_work' => true, 'start' => '08:00', 'end' => '17:00', 'has_break' => true, 'break_start' => '11:30', 'break_end' => '13:30', 'break_minutes' => 60],
                'sat' => ['is_work' => true, 'start' => '08:00', 'end' => '12:00', 'has_break' => false, 'break_start' => null, 'break_end' => null, 'break_minutes' => 0],
                'sun' => ['is_work' => false],
            ],
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Artisan Worker',
            'role' => 'Weaver',
            'salary' => 20000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
            'schedule_type' => 'default',
        ]);

        // Monday (2026-08-24 is a Monday)
        $monPolicy = $employee->getEffectiveShiftPolicy($owner, Carbon::parse('2026-08-24'));
        $this->assertEquals('08:00', $monPolicy['shift_start_time']);
        $this->assertEquals('17:00', $monPolicy['shift_end_time']);
        $this->assertTrue($monPolicy['has_break']);
        $this->assertEquals(60, $monPolicy['break_allowance_minutes']);

        // Saturday (2026-08-29 is a Saturday)
        $satPolicy = $employee->getEffectiveShiftPolicy($owner, Carbon::parse('2026-08-29'));
        $this->assertEquals('08:00', $satPolicy['shift_start_time']);
        $this->assertEquals('12:00', $satPolicy['shift_end_time']);
        $this->assertFalse($satPolicy['has_break']);
        $this->assertEquals(0, $satPolicy['break_allowance_minutes']);

        // Sunday (2026-08-30 is a Sunday)
        $this->assertTrue($employee->isRestDay(Carbon::parse('2026-08-30'), $owner));
        $this->assertFalse($employee->isScheduledWorkingDay(Carbon::parse('2026-08-30'), $owner));
    }

    public function test_staff_clock_in_uses_saturday_daily_shift_boundary(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'shift_schedule_mode' => 'per_day',
            'daily_shifts' => [
                'sat' => ['is_work' => true, 'start' => '08:00', 'end' => '12:00', 'has_break' => false, 'break_start' => null, 'break_end' => null, 'break_minutes' => 0],
            ],
            'grace_period_minutes' => 15,
            'earliest_clock_in_minutes' => 30,
            'enforce_strict_shift_window' => true,
        ]);
        $owner->modules_enabled = ['hr' => true];
        $owner->save();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Artisan Saturday Staff',
            'role' => 'Weaver',
            'salary' => 20000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
            'schedule_type' => 'default',
        ]);

        $staff = User::factory()->staff($owner)->create([
            'name' => $employee->name,
            'email_verified_at' => now(config('app.timezone')),
            'must_change_password' => false,
            'employee_id' => $employee->id,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        // Saturday August 29, 2026 at 08:05 AM (on time)
        Carbon::setTestNow(Carbon::parse('2026-08-29 08:05:00', config('app.timezone')));

        $service = app(StaffAttendanceService::class);
        $session = $service->ensureClockedIn($staff, [
            'photo_data' => 'data:image/jpeg;base64,samplephoto',
        ]);

        $this->assertFalse($session->is_late);
        $this->assertSame(0, $session->late_minutes);

        // Staff clocks out at 12:00 PM (end of half-day shift) -> no undertime
        Carbon::setTestNow(Carbon::parse('2026-08-29 12:00:00', config('app.timezone')));
        $closedSession = $service->closeOpenSession($staff, StaffAttendanceService::MODE_CLOCKED_OUT);

        $this->assertFalse($closedSession->is_early_departure);
        $this->assertSame(0, $closedSession->undertime_minutes);
    }

    public function test_employee_custom_daily_shift_overrides_workshop_policy(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'shift_start_time' => '08:00',
            'shift_end_time' => '17:00',
            'shift_schedule_mode' => 'uniform',
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Night Shift Worker',
            'role' => 'Kiln Operator',
            'salary' => 25000,
            'status' => 'Active',
            'join_date' => now()->toDateString(),
            'schedule_type' => 'custom',
            'shift_schedule_mode' => 'per_day',
            'daily_shifts' => [
                'fri' => ['is_work' => true, 'start' => '14:00', 'end' => '22:00', 'has_break' => true, 'break_start' => '18:00', 'break_end' => '19:00', 'break_minutes' => 60],
            ],
        ]);

        // Friday (2026-08-28 is a Friday)
        $friPolicy = $employee->getEffectiveShiftPolicy($owner, Carbon::parse('2026-08-28'));
        $this->assertTrue($friPolicy['is_custom']);
        $this->assertEquals('per_day', $friPolicy['shift_schedule_mode']);
        $this->assertEquals('14:00', $friPolicy['shift_start_time']);
        $this->assertEquals('22:00', $friPolicy['shift_end_time']);
    }

    public function test_saving_workshop_daily_shifts_via_hr_settings(): void
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'payroll_working_days' => 22,
        ]);
        $owner->modules_enabled = ['hr' => true];
        $owner->save();

        $dailyShifts = [
            'mon' => ['is_work' => true, 'start' => '08:00', 'end' => '17:00', 'has_break' => true, 'break_start' => '11:30', 'break_end' => '13:30', 'break_minutes' => 60],
            'sat' => ['is_work' => true, 'start' => '08:00', 'end' => '12:00', 'has_break' => false, 'break_start' => null, 'break_end' => null, 'break_minutes' => 0],
            'sun' => ['is_work' => false],
        ];

        $response = $this->actingAs($owner)->post(route('hr.settings'), [
            'payroll_working_days' => 24,
            'standard_workday_hours' => 8.0,
            'shift_schedule_mode' => 'per_day',
            'daily_shifts' => $dailyShifts,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success');

        $owner->refresh();
        $this->assertEquals('per_day', $owner->shift_schedule_mode);
        $this->assertTrue($owner->isDailyShiftMode());
        $this->assertIsArray($owner->daily_shifts);
        $this->assertEquals('12:00', $owner->daily_shifts['sat']['end']);
    }
}
