<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\StaffAttendanceSession;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class StaffAttendancePayrollTest extends TestCase
{
    use RefreshDatabase;

    public function test_hr_page_includes_attendance_summary_and_payroll_prefill_for_linked_staff(): void
    {
        [$owner, $employee] = $this->createOwnerWithHrAccessAndEmployee();
        $staffLogin = User::factory()->staff($owner)->create([
            'name' => $employee->name,
            'email_verified_at' => now(config('app.timezone')),
            'must_change_password' => false,
            'employee_id' => $employee->id,
            'staff_role_preset_key' => 'hr',
            'staff_module_permissions' => User::withWorkspaceAccessFlag(['hr' => true], true),
        ]);

        $monthStart = now(config('app.timezone'))->copy()->startOfMonth()->setTime(8, 0);

        $this->createClosedSession($staffLogin, $owner, $employee, $monthStart->copy(), $monthStart->copy()->addHours(8), 'clocked_out');
        $this->createClosedSession($staffLogin, $owner, $employee, $monthStart->copy()->addDay(), $monthStart->copy()->addDay()->addHours(6), 'paused');
        $this->createClosedSession($staffLogin, $owner, $employee, $monthStart->copy()->addDays(2), $monthStart->copy()->addDays(2)->addHours(10), 'clocked_out');

        $response = $this->actingAs($owner)->get(route('hr.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Seller/HR')
            ->where('sellerSettings.attendance_month_label', now(config('app.timezone'))->format('F Y'))
            ->has('staff', 1)
            ->where('staff.0.id', $employee->id)
            ->where('staff.0.attendance.current_state', 'clocked_out')
            ->where('staff.0.attendance.days_worked', 3)
            ->where('staff.0.attendance.has_attendance_source', true)
            ->where('staff.0.payroll_prefill.days_worked', 3)
            ->where('staff.0.payroll_prefill.absences_days', 17)
            ->where('staff.0.payroll_prefill.undertime_hours', 2)
            ->where('staff.0.payroll_prefill.overtime_hours', 2)
        );
    }

    public function test_generate_payroll_still_accepts_edited_values_after_attendance_prefill(): void
    {
        [$owner, $employee] = $this->createOwnerWithHrAccessAndEmployee();

        $response = $this->actingAs($owner)->post(route('hr.generate'), [
            'month' => now(config('app.timezone'))->format('F Y'),
            'items' => [
                [
                    'employee_id' => $employee->id,
                    'absences_days' => 1,
                    'undertime_hours' => 1.5,
                    'overtime_hours' => 2,
                ],
            ],
        ]);

        $response->assertRedirect();
        $response->assertSessionHas('success', 'Payroll generated successfully! Waiting for Accounting approval.');
        $this->assertDatabaseHas('payrolls', [
            'user_id' => $owner->id,
            'month' => now(config('app.timezone'))->format('F Y'),
            'employee_count' => 1,
            'status' => 'Pending',
        ]);

        $payroll = Payroll::query()->firstOrFail();
        $item = PayrollItem::query()->where('payroll_id', $payroll->id)->firstOrFail();

        $this->assertSame($employee->id, $item->employee_id);
        $this->assertSame(19, $item->days_worked);
        $this->assertEquals(1.0, (float) $item->absences_days);
        $this->assertEquals(1.5, (float) $item->undertime_hours);
        $this->assertEquals(2.0, (float) $item->overtime_hours);
        $this->assertGreaterThan(0, (float) $item->net_pay);
    }

    /**
     * @return array{0: \App\Models\User, 1: \App\Models\Employee}
     */
    private function createOwnerWithHrAccessAndEmployee(): array
    {
        $owner = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'overtime_rate' => 75,
            'payroll_working_days' => 20,
        ]);

        $owner->modules_enabled = [
            'hr' => true,
            'accounting' => false,
            'procurement' => true,
        ];
        $owner->save();

        $employee = Employee::create([
            'user_id' => $owner->id,
            'name' => 'Payroll Staff',
            'role' => 'Studio Assistant',
            'salary' => 20000,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(2),
        ]);

        return [$owner, $employee];
    }

    private function createClosedSession(
        User $staff,
        User $owner,
        Employee $employee,
        \Carbon\CarbonInterface $clockIn,
        \Carbon\CarbonInterface $clockOut,
        string $closeMode
    ): void {
        StaffAttendanceSession::create([
            'staff_user_id' => $staff->id,
            'seller_owner_id' => $owner->id,
            'employee_id' => $employee->id,
            'attendance_date' => $clockIn->toDateString(),
            'clock_in_at' => $clockIn,
            'clock_out_at' => $clockOut,
            'close_mode' => $closeMode,
            'worked_minutes' => $clockIn->diffInMinutes($clockOut),
        ]);
    }
}
