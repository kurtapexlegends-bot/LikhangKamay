<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\User;
use App\Services\PayrollCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollComplianceServiceTest extends TestCase
{
    use RefreshDatabase;

    protected PayrollCalculationService $payrollService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->payrollService = new PayrollCalculationService();
    }

    public function test_calculate_employee_row_with_multiplier(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'payroll_working_days' => 20,
            'overtime_multiplier' => 1.50,
        ]);

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'John Doe',
            'role' => 'Artisan Assistant',
            'salary' => 16000, // Daily rate = 16000 / 20 = 800. Hourly rate = 800 / 8 = 100
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        // Scenario: 2 hours overtime, 1.5 hours undertime, 1 day absence
        // Overtime rate: 100 * 1.50 = 150/hr => 2 hrs * 150 = 300
        // Undertime deduction: 1.5 hrs * 100 = 150
        // Absence deduction: 1 day * 800 = 800
        // Expected Net Pay: 16000 + 300 - 150 - 800 = 15350
        $inputs = [
            'absences_days' => 1,
            'undertime_hours' => 1.5,
            'overtime_hours' => 2,
        ];

        $result = $this->payrollService->calculateEmployeeRow($employee, $inputs, $seller);

        $this->assertEquals(16000, $result['base_salary']);
        $this->assertEquals(19, $result['days_worked']);
        $this->assertEquals(800.00, $result['absence_deduction']);
        $this->assertEquals(150.00, $result['undertime_deduction']);
        $this->assertEquals(300.00, $result['overtime_pay']);
        $this->assertEquals(15350.00, $result['net_pay']);
    }

    public function test_calculate_payroll_items_aggregates_total(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'payroll_working_days' => 20,
            'overtime_multiplier' => 1.25,
        ]);

        $emp1 = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Alice',
            'role' => 'Assistant',
            'salary' => 16000, // Daily rate = 800. Hourly rate = 100
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        $emp2 = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Bob',
            'role' => 'Potter',
            'salary' => 20000, // Daily rate = 1000. Hourly rate = 125
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        // Alice: 4 hrs OT, 0 UT, 0 Absences => OT Pay = 4 * 100 * 1.25 = 500 => Net = 16500
        // Bob: 0 hrs OT, 8 hrs UT, 0 Absences => UT deduction = 8 * 125 = 1000 => Net = 19000
        // Total amount = 16500 + 19000 = 35500
        $selectedItems = [
            [
                'employee_id' => $emp1->id,
                'absences_days' => 0,
                'undertime_hours' => 0,
                'overtime_hours' => 4,
            ],
            [
                'employee_id' => $emp2->id,
                'absences_days' => 0,
                'undertime_hours' => 8,
                'overtime_hours' => 0,
            ],
        ];

        $results = $this->payrollService->calculatePayrollItems($selectedItems, $seller);

        $this->assertCount(2, $results['items']);
        $this->assertEquals(35500.00, $results['total_amount']);
    }

    public function test_generate_payroll_route_uses_multiplier_and_saves_correctly(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'payroll_working_days' => 20,
            'overtime_multiplier' => 1.50,
        ]);
        $seller->modules_enabled = [
            'hr' => true,
            'accounting' => true,
        ];
        $seller->save();

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Jane Smith',
            'role' => 'Artisan Assistant',
            'salary' => 16000,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        $response = $this->actingAs($seller)->post(route('hr.generate'), [
            'month' => 'June 2026',
            'items' => [
                [
                    'employee_id' => $employee->id,
                    'absences_days' => 0,
                    'undertime_hours' => 0,
                    'overtime_hours' => 10, // OT Pay: 10 * (100 * 1.5) = 1500 => Net: 17500
                    'isSelected' => true,
                ]
            ]
        ]);

        $response->assertRedirect();

        $this->assertDatabaseHas('payrolls', [
            'user_id' => $seller->id,
            'month' => 'June 2026',
            'total_amount' => 17500.00,
        ]);

        $this->assertDatabaseHas('payroll_items', [
            'employee_id' => $employee->id,
            'base_salary' => 16000.00,
            'overtime_hours' => 10,
            'overtime_pay' => 1500.00,
            'net_pay' => 17500.00,
        ]);
    }

    public function test_calculate_employee_row_with_261_factor_method(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'payroll_factor_method' => '261',
            'overtime_multiplier' => 1.25,
        ]);

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'EEMR 261 Test',
            'role' => 'Weaver',
            'salary' => 20000,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        // Salary: 20,000. Under 261 method:
        // Daily rate: (20,000 * 12) / 261 = 240,000 / 261 = 919.5402
        // Hourly rate: 919.5402 / 8 = 114.9425
        // Let's test with 2 days absences, 4 hours overtime.
        // Absence deduction: 2 * 919.5402 = 1839.08
        // Overtime pay: 4 * (114.9425 * 1.25) = 4 * 143.6781 = 574.71
        // Expected Net Pay: 20000 + 574.71 - 1839.08 = 18735.63
        $inputs = [
            'absences_days' => 2,
            'undertime_hours' => 0,
            'overtime_hours' => 4,
        ];

        $result = $this->payrollService->calculateEmployeeRow($employee, $inputs, $seller);

        $this->assertEquals(20000, $result['base_salary']);
        $this->assertEquals(round(261.0/12.0 - 2, 1), $result['days_worked']);
        $this->assertEquals(1839.08, $result['absence_deduction']);
        $this->assertEquals(574.71, $result['overtime_pay']);
        $this->assertEquals(18735.63, $result['net_pay']);
    }

    public function test_calculate_employee_row_with_313_factor_method(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'payroll_factor_method' => '313',
            'overtime_multiplier' => 1.25,
        ]);

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'EEMR 313 Test',
            'role' => 'Weaver',
            'salary' => 20000,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        // Salary: 20,000. Under 313 method:
        // Daily rate: (20,000 * 12) / 313 = 240,000 / 313 = 766.77316
        // Hourly rate: 766.77316 / 8 = 95.8466
        // Let's test with 1 day absence, 8 hours regular overtime.
        // Absence deduction: 1 * 766.77 = 766.77
        // Overtime pay: 8 * (95.8466 * 1.25) = 8 * 119.808 = 958.47
        // Expected Net Pay: 20000 + 958.47 - 766.77 = 20191.70
        $inputs = [
            'absences_days' => 1,
            'undertime_hours' => 0,
            'overtime_hours' => 8,
        ];

        $result = $this->payrollService->calculateEmployeeRow($employee, $inputs, $seller);

        $this->assertEquals(20000, $result['base_salary']);
        $this->assertEquals(round(313.0/12.0 - 1, 1), $result['days_worked']);
        $this->assertEquals(766.77, $result['absence_deduction']);
        $this->assertEquals(958.47, $result['overtime_pay']);
        $this->assertEquals(20191.69, $result['net_pay']);
    }

    public function test_calculate_employee_row_with_paid_leaves_and_tiered_overtime(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'payroll_working_days' => 20,
            'overtime_multiplier' => 1.25,
            'rest_day_ot_multiplier' => 1.69,
            'holiday_ot_multiplier' => 2.60,
        ]);

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Paid Leaves & Tiered OT Test',
            'role' => 'Weaver',
            'salary' => 16000, // Daily rate = 16000 / 20 = 800. Hourly rate = 100
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        // Scenario:
        // 2 days paid leaves (does not deduct salary, absence_deduction = 0)
        // 1 day unpaid absence (deducts 1 day = 800)
        // 2 hours regular workday OT => 2 * 100 * 1.25 = 250
        // 3 hours rest day OT => 3 * 100 * 1.69 = 507
        // 4 hours holiday OT => 4 * 100 * 2.60 = 1040
        // Total Overtime Pay: 250 + 507 + 1040 = 1797
        // Expected Net Pay: 16000 + 1797 - 800 = 16997
        $inputs = [
            'absences_days' => 1,
            'paid_leave_days' => 2,
            'undertime_hours' => 0,
            'overtime_hours' => 2,
            'rest_day_ot_hours' => 3,
            'holiday_ot_hours' => 4,
        ];

        $result = $this->payrollService->calculateEmployeeRow($employee, $inputs, $seller);

        $this->assertEquals(16000, $result['base_salary']);
        $this->assertEquals(19, $result['days_worked']); // working days (20) - absences (1) = 19
        $this->assertEquals(800.00, $result['absence_deduction']);
        $this->assertEquals(2, $result['paid_leave_days']);
        $this->assertEquals(250.00, $result['overtime_pay']);
        $this->assertEquals(507.00, $result['rest_day_ot_pay']);
        $this->assertEquals(1040.00, $result['holiday_ot_pay']);
        $this->assertEquals(16997.00, $result['net_pay']);
    }
}
