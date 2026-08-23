<?php

namespace Tests\Feature\Staff;

use App\Models\Employee;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\HR\AttendanceAggregatorService;
use App\Services\HR\PayrollCalculatorService;
use App\Services\StaffAttendanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FlexibleStaffShiftScheduleTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_employee_with_custom_shift_and_working_days(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $response = $this->actingAs($owner)->post(route('hr.store'), [
            'name' => 'Carla Diaz',
            'role' => 'Part-Time Artisan',
            'salary' => 12000,
            'schedule_type' => 'custom',
            'working_days' => ['tue', 'wed', 'thu', 'fri', 'sat'],
            'shift_start_time' => '10:00',
            'shift_end_time' => '19:00',
            'standard_workday_hours' => 6.0,
            'grace_period_minutes' => 15,
            'break_allowance_minutes' => 60,
            'create_login_account' => false,
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Employee added successfully.');

        $employee = Employee::where('name', 'Carla Diaz')->first();
        $this->assertNotNull($employee);
        $this->assertSame('custom', $employee->schedule_type);
        $this->assertSame(['tue', 'wed', 'thu', 'fri', 'sat'], $employee->working_days);
        $this->assertSame('10:00', $employee->shift_start_time);
        $this->assertSame('19:00', $employee->shift_end_time);
        $this->assertEquals(6.0, $employee->standard_workday_hours);

        // Effective working days
        $this->assertSame(['tue', 'wed', 'thu', 'fri', 'sat'], $employee->getEffectiveWorkingDays($owner));
        $this->assertEquals(6.0, $employee->getEffectiveWorkdayHours($owner));

        // Monday (2026-08-24 is a Monday)
        $monday = Carbon::parse('2026-08-24');
        $this->assertFalse($employee->isScheduledWorkingDay($monday, $owner));
        $this->assertTrue($employee->isRestDay($monday, $owner));

        // Tuesday (2026-08-25 is a Tuesday)
        $tuesday = Carbon::parse('2026-08-25');
        $this->assertTrue($employee->isScheduledWorkingDay($tuesday, $owner));
        $this->assertFalse($employee->isRestDay($tuesday, $owner));
    }

    public function test_employee_falls_back_seamlessly_to_workshop_defaults(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $owner->update([
            'shift_start_time' => '08:30',
            'shift_end_time' => '17:30',
            'standard_workday_hours' => 8.0,
            'payroll_factor_method' => '261', // Mon-Fri
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Default Staff',
            'role' => 'Full-Time Assistant',
            'salary' => 18000,
            'join_date' => now(),
            'schedule_type' => 'default',
            'status' => 'Active',
        ]);

        $policy = $employee->getEffectiveShiftPolicy($owner);
        $this->assertFalse($policy['is_custom']);
        $this->assertSame('08:30', $policy['shift_start_time']);
        $this->assertSame('17:30', $policy['shift_end_time']);
        $this->assertEquals(8.0, $employee->getEffectiveWorkdayHours($owner));

        // 261 factor -> Mon-Fri working days
        $this->assertSame(['mon', 'tue', 'wed', 'thu', 'fri'], $employee->getEffectiveWorkingDays($owner));

        // Sunday is rest day
        $sunday = Carbon::parse('2026-08-23');
        $this->assertTrue($employee->isRestDay($sunday, $owner));
        $this->assertFalse($employee->isScheduledWorkingDay($sunday, $owner));
    }

    public function test_staff_clock_in_evaluates_against_custom_shift_hours(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $owner->update([
            'shift_start_time' => '08:00',
            'shift_end_time' => '17:00',
            'enforce_strict_shift_window' => false,
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Evening Shift Staff',
            'role' => 'Evening Artisan',
            'salary' => 20000,
            'join_date' => now(),
            'schedule_type' => 'custom',
            'working_days' => ['mon', 'tue', 'wed', 'thu', 'fri'],
            'shift_start_time' => '13:00',
            'shift_end_time' => '22:00',
            'grace_period_minutes' => 15,
            'standard_workday_hours' => 8.0,
            'status' => 'Active',
        ]);

        $staff = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
        ]);

        $attendanceService = new StaffAttendanceService();

        // 1. Clock in at 13:10 (within 15-min grace period) -> Not late
        Carbon::setTestNow(Carbon::parse('2026-08-24 13:10:00', config('app.timezone')));
        $session1 = $attendanceService->ensureClockedIn($staff);

        $this->assertNotNull($session1);
        $this->assertFalse((bool) $session1->is_late);
        $this->assertSame(0, (int) $session1->late_minutes);

        // Close session
        $attendanceService->closeOpenSession($staff, StaffAttendanceService::MODE_CLOCKED_OUT);

        // 2. Next day clock in at 13:30 (30 mins after shift start, grace period is 15 mins) -> Late by 30 mins
        Carbon::setTestNow(Carbon::parse('2026-08-25 13:30:00', config('app.timezone')));
        $session2 = $attendanceService->ensureClockedIn($staff);

        $this->assertNotNull($session2);
        $this->assertTrue((bool) $session2->is_late);
        $this->assertSame(30, (int) $session2->late_minutes);

        Carbon::setTestNow();
    }

    public function test_attendance_aggregator_classifies_rest_day_hours_as_rest_day_ot(): void
    {
        $owner = $this->createOwnerWithHrAccess();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Weekend Staff',
            'role' => 'Artisan',
            'salary' => 15000,
            'join_date' => now(),
            'schedule_type' => 'custom',
            'working_days' => ['tue', 'wed', 'thu', 'fri', 'sat'], // Sunday & Monday are rest days
            'shift_start_time' => '09:00',
            'shift_end_time' => '18:00',
            'standard_workday_hours' => 8.0,
            'status' => 'Active',
        ]);

        $staff = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
        ]);

        // Worked 8 hours on Monday (2026-08-24), which is employee's rest day
        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => '2026-08-24',
            'clock_in_at' => Carbon::parse('2026-08-24 09:00:00'),
            'clock_out_at' => Carbon::parse('2026-08-24 17:00:00'),
            'worked_minutes' => 480, // 8 hours
            'approval_status' => 'approved',
        ]);

        // Worked 8 hours on Tuesday (2026-08-25), which is a normal scheduled workday
        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => '2026-08-25',
            'clock_in_at' => Carbon::parse('2026-08-25 09:00:00'),
            'clock_out_at' => Carbon::parse('2026-08-25 17:00:00'),
            'worked_minutes' => 480, // 8 hours
            'approval_status' => 'approved',
        ]);

        $aggregator = new AttendanceAggregatorService();
        $summary = $aggregator->aggregateForPeriod($employee, '2026-08-01', '2026-08-31', $owner);

        $this->assertTrue($summary['has_records']);
        $this->assertEquals(16.0, $summary['total_worked_hours']);
        $this->assertEquals(8.0, $summary['rest_day_ot_hours']); // Monday was correctly tagged as rest day OT
        $this->assertEquals(0.0, $summary['overtime_hours']);
    }

    public function test_payroll_calculator_uses_effective_workday_hours_for_hourly_rate(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $owner->update([
            'payroll_factor_method' => 'custom',
            'payroll_working_days' => 26,
            'overtime_multiplier' => 1.25,
        ]);

        // 4-hour half-day part-timer
        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Half-day Artisan',
            'role' => 'Part-Time',
            'salary' => 13000,
            'join_date' => now(),
            'schedule_type' => 'custom',
            'working_days' => ['mon', 'tue', 'wed', 'thu', 'fri'],
            'standard_workday_hours' => 4.0, // 4 hours/day
            'status' => 'Active',
        ]);

        $calculator = new PayrollCalculatorService();

        // 26 working days in month
        // Daily rate = 13000 / 26 = 500
        // Standard workday hours = 4.0
        // Hourly rate = 500 / 4.0 = 125.00
        // 2 hours overtime -> 2 * (125 * 1.25) = 312.50
        $row = $calculator->calculateEmployeeRow(
            $employee,
            [
                'working_days' => 26,
                'absences_days' => 0,
                'overtime_hours' => 2.0,
                'rest_day_ot_hours' => 0,
                'holiday_ot_hours' => 0,
                'bonus' => 0,
                'deductions' => 0,
            ],
            $owner
        );

        $this->assertEquals(500.00, $row['meta']['daily_rate']);
        $this->assertEquals(125.00, $row['meta']['hourly_rate']);
        $this->assertEquals(312.50, $row['overtime_pay']);
    }

    public function test_remote_field_worker_clock_in_is_approved_without_geofence_flagging(): void
    {
        $owner = $this->createOwnerWithHrAccess();
        $location = \App\Models\SellerLocation::create([
            'user_id' => $owner->id,
            'name' => 'Main Workshop',
            'latitude' => 14.5995,
            'longitude' => 120.9842,
            'radius_meters' => 200,
            'enforce_strict_geofence' => true,
            'is_active' => true,
        ]);

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Field Driver',
            'role' => 'Logistics / Driver',
            'salary' => 18000,
            'join_date' => now(),
            'schedule_type' => 'custom',
            'working_days' => ['mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
            'shift_start_time' => '08:00',
            'shift_end_time' => '17:00',
            'allow_remote_clock_in' => true, // Remote/Field worker
            'assigned_location_id' => $location->id,
            'status' => 'Active',
        ]);

        $staff = User::factory()->staff($owner)->create([
            'employee_id' => $employee->id,
        ]);

        $attendanceService = app(StaffAttendanceService::class);

        // Clock in from 10km away (14.6500, 121.0500) during normal morning shift on Monday
        Carbon::setTestNow(Carbon::parse('2026-08-24 08:05:00', config('app.timezone')));

        $session = $attendanceService->ensureClockedIn($staff, [
            'latitude' => 14.6500,
            'longitude' => 121.0500,
        ]);

        $this->assertNotNull($session);
        $this->assertFalse((bool) $session->is_flagged);
        $this->assertSame('approved', $session->approval_status);
        $this->assertNull($session->flag_reason);

        Carbon::setTestNow();
    }

    private function createOwnerWithHrAccess(): User
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

        return $owner;
    }
}
