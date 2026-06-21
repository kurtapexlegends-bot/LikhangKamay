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
}
