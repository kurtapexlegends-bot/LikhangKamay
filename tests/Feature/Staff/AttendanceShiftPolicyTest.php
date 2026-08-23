<?php

namespace Tests\Feature\Staff;

use App\Models\Employee;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use App\Services\StaffAttendanceService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AttendanceShiftPolicyTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_late_clock_in_is_evaluated_and_flagged_with_late_minutes(): void
    {
        [$owner, $employee, $staff] = $this->createStaffWithShiftPolicy(
            shiftStart: '08:00',
            gracePeriod: 15
        );

        // Staff clocks in at 8:35 AM (past 8:15 AM grace threshold)
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(8, 35));

        $service = app(StaffAttendanceService::class);
        $session = $service->ensureClockedIn($staff, [
            'photo_data' => 'data:image/jpeg;base64,samplephoto',
            'liveness_verified' => true,
        ]);

        $this->assertTrue($session->is_late);
        $this->assertSame(35, $session->late_minutes);
        $this->assertTrue($session->liveness_verified);
    }

    public function test_on_time_clock_in_within_grace_period_is_not_flagged_as_late(): void
    {
        [$owner, $employee, $staff] = $this->createStaffWithShiftPolicy(
            shiftStart: '08:00',
            gracePeriod: 15
        );

        // Staff clocks in at 8:10 AM (within 8:15 AM grace threshold)
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(8, 10));

        $service = app(StaffAttendanceService::class);
        $session = $service->ensureClockedIn($staff, [
            'photo_data' => 'data:image/jpeg;base64,samplephoto',
        ]);

        $this->assertFalse($session->is_late);
        $this->assertSame(0, $session->late_minutes);
    }

    public function test_early_clock_out_calculates_undertime_and_records_reason(): void
    {
        [$owner, $employee, $staff] = $this->createStaffWithShiftPolicy(
            shiftStart: '08:00',
            shiftEnd: '17:00'
        );

        // Clock in at 8:00 AM
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(8, 0));
        $service = app(StaffAttendanceService::class);
        $session = $service->ensureClockedIn($staff);

        // Clock out early at 3:30 PM (15:30) with reason
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(15, 30));

        $this->actingAs($staff)->post(route('staff.logout'), [
            'action' => 'clock_out',
            'early_departure_reason' => 'Medical / Feeling Unwell',
        ])->assertRedirect();

        $session->refresh();
        $this->assertTrue($session->is_early_departure);
        $this->assertSame(90, $session->undertime_minutes); // 1.5 hours = 90 mins
        $this->assertSame('Medical / Feeling Unwell', $session->early_departure_reason);
    }

    public function test_extended_break_is_flagged_when_exceeding_allowance(): void
    {
        [$owner, $employee, $staff] = $this->createStaffWithShiftPolicy(
            breakAllowance: 60
        );

        // Clock in at 8:00 AM
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(8, 0));
        $service = app(StaffAttendanceService::class);
        $session1 = $service->ensureClockedIn($staff);

        // Take break at 12:00 PM
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(12, 0));
        $service->closeOpenSession($staff, StaffAttendanceService::MODE_PAUSED);

        // Resume break at 1:30 PM (90 mins later, exceeding 60m allowance)
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(13, 30));
        $session2 = $service->ensureClockedIn($staff);

        $this->assertTrue($session2->is_extended_break);
        $this->assertSame(90, $session2->total_break_minutes);
    }

    public function test_early_clock_in_is_strictly_blocked_when_strict_enforcement_is_on(): void
    {
        [$owner, $employee, $staff] = $this->createStaffWithShiftPolicy(
            shiftStart: '08:00',
            earliestBuffer: 30,
            strictWindow: true
        );

        // Staff attempts to clock in at 1:52 AM (hours before 7:30 AM earliest entry)
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(1, 52));

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $service = app(StaffAttendanceService::class);
        $service->ensureClockedIn($staff);
    }

    public function test_early_clock_in_is_flagged_for_approval_when_strict_enforcement_is_off(): void
    {
        [$owner, $employee, $staff] = $this->createStaffWithShiftPolicy(
            shiftStart: '08:00',
            earliestBuffer: 30,
            strictWindow: false
        );

        // Staff clocks in at 1:52 AM (allowed but flagged for manager review)
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(1, 52));

        $service = app(StaffAttendanceService::class);
        $session = $service->ensureClockedIn($staff);

        $this->assertTrue($session->is_flagged);
        $this->assertSame('pending', $session->approval_status);
        $this->assertStringContainsString('Early Clock In', $session->flag_reason);
    }

    public function test_clock_in_within_earliest_allowed_window_is_approved(): void
    {
        [$owner, $employee, $staff] = $this->createStaffWithShiftPolicy(
            shiftStart: '08:00',
            earliestBuffer: 30,
            strictWindow: true
        );

        // Staff clocks in at 7:45 AM (within 7:30 AM - 8:00 AM window)
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(7, 45));

        $service = app(StaffAttendanceService::class);
        $session = $service->ensureClockedIn($staff);

        $this->assertFalse($session->is_flagged);
        $this->assertSame('approved', $session->approval_status);
        $this->assertFalse($session->is_late);
    }

    public function test_after_hours_clock_in_is_blocked_when_strict_enforcement_is_on(): void
    {
        [$owner, $employee, $staff] = $this->createStaffWithShiftPolicy(
            shiftStart: '08:00',
            shiftEnd: '17:00',
            strictWindow: true
        );

        // Staff attempts to clock in at 11:00 PM (23:00) after closing
        Carbon::setTestNow(Carbon::parse('2026-08-24', config('app.timezone'))->startOfDay()->setTime(23, 0));

        $this->expectException(\Illuminate\Validation\ValidationException::class);
        $service = app(StaffAttendanceService::class);
        $service->ensureClockedIn($staff);
    }

    /**
     * @return array{0: \App\Models\User, 1: \App\Models\Employee, 2: \App\Models\User}
     */
    private function createStaffWithShiftPolicy(
        string $shiftStart = '08:00',
        string $shiftEnd = '17:00',
        int $gracePeriod = 15,
        int $breakAllowance = 60,
        int $earliestBuffer = 30,
        bool $strictWindow = true
    ): array {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'shift_start_time' => $shiftStart,
            'shift_end_time' => $shiftEnd,
            'grace_period_minutes' => $gracePeriod,
            'earliest_clock_in_minutes' => $earliestBuffer,
            'enforce_strict_shift_window' => $strictWindow,
            'break_window_start' => '11:30',
            'break_window_end' => '13:30',
            'break_allowance_minutes' => $breakAllowance,
        ]);
        $owner->modules_enabled = [
            'hr' => true,
        ];
        $owner->save();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Workshop Artisan',
            'role' => 'Master Carver',
            'salary' => 22000,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonth(),
        ]);

        $staff = User::factory()->staff($owner)->create([
            'name' => $employee->name,
            'email_verified_at' => now(config('app.timezone')),
            'must_change_password' => false,
            'employee_id' => $employee->id,
            'staff_role_preset_key' => 'custom',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        return [$owner, $employee, $staff];
    }
}
