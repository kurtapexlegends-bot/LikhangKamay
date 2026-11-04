<?php

namespace Tests\Feature\Seller;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\User;
use App\Services\HR\PayrollCalculatorService;
use App\Services\HR\StatutoryDeductionService;
use App\Support\HR\HREmployeeLoader;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StatutoryPayrollDeductionsTest extends TestCase
{
    use RefreshDatabase;

    protected StatutoryDeductionService $statutoryService;
    protected PayrollCalculatorService $payrollService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->statutoryService = new StatutoryDeductionService();
        $this->payrollService = new PayrollCalculatorService($this->statutoryService);
    }

    public function test_sss_contribution_brackets_under_ra_11199(): void
    {
        // 1. Below minimum MSC floor (PHP 4,000)
        $belowFloor = $this->statutoryService->calculateSss(3500.00);
        $this->assertEquals(180.00, $belowFloor['ee']); // 4.5% of 4000
        $this->assertEquals(380.00, $belowFloor['er']); // 9.5% of 4000
        $this->assertEquals(560.00, $belowFloor['total']);

        // 2. Standard salary (PHP 15,000)
        $standard = $this->statutoryService->calculateSss(15000.00);
        $this->assertEquals(675.00, $standard['ee']); // 4.5% of 15000
        $this->assertEquals(1425.00, $standard['er']); // 9.5% of 15000
        $this->assertEquals(2100.00, $standard['total']);

        // 3. Above maximum MSC ceiling (PHP 30,000 cap)
        $aboveCeiling = $this->statutoryService->calculateSss(45000.00);
        $this->assertEquals(1350.00, $aboveCeiling['ee']); // 4.5% of 30000
        $this->assertEquals(2850.00, $aboveCeiling['er']); // 9.5% of 30000
        $this->assertEquals(4200.00, $aboveCeiling['total']);
    }

    public function test_philhealth_contribution_brackets_under_ra_11223(): void
    {
        // 1. Below minimum salary floor (PHP 10,000)
        $belowFloor = $this->statutoryService->calculatePhilHealth(8000.00);
        $this->assertEquals(250.00, $belowFloor['ee']); // 2.5% of 10000
        $this->assertEquals(250.00, $belowFloor['er']); // 2.5% of 10000
        $this->assertEquals(500.00, $belowFloor['total']);

        // 2. Standard salary (PHP 20,000)
        $standard = $this->statutoryService->calculatePhilHealth(20000.00);
        $this->assertEquals(500.00, $standard['ee']); // 2.5% of 20000
        $this->assertEquals(500.00, $standard['er']); // 2.5% of 20000
        $this->assertEquals(1000.00, $standard['total']);

        // 3. Above maximum salary ceiling (PHP 100,000)
        $aboveCeiling = $this->statutoryService->calculatePhilHealth(150000.00);
        $this->assertEquals(2500.00, $aboveCeiling['ee']); // 2.5% of 100000
        $this->assertEquals(2500.00, $aboveCeiling['er']); // 2.5% of 100000
        $this->assertEquals(5000.00, $aboveCeiling['total']);
    }

    public function test_pagibig_contribution_under_hdmf_circular_460(): void
    {
        // 1. Standard salary (PHP 10,000, capped at PHP 200 max)
        $standard = $this->statutoryService->calculatePagIbig(10000.00);
        $this->assertEquals(200.00, $standard['ee']);
        $this->assertEquals(200.00, $standard['er']);
        $this->assertEquals(400.00, $standard['total']);

        // 2. High salary (PHP 50,000, capped at PHP 200 max)
        $high = $this->statutoryService->calculatePagIbig(50000.00);
        $this->assertEquals(200.00, $high['ee']);
        $this->assertEquals(200.00, $high['er']);
        $this->assertEquals(400.00, $high['total']);
    }

    public function test_bir_train_law_withholding_tax_brackets(): void
    {
        // Bracket 1: <= 20,833.33 (Exempt)
        $this->assertEquals(0.00, $this->statutoryService->calculateWithholdingTax(18000.00));
        $this->assertEquals(0.00, $this->statutoryService->calculateWithholdingTax(20833.33));

        // Bracket 2: 20,833.34 to 33,333.33 (15% excess)
        // 25,000 - 20,833.33 = 4,166.67 * 0.15 = 625.00
        $this->assertEquals(625.00, $this->statutoryService->calculateWithholdingTax(25000.00));

        // Bracket 3: 33,333.34 to 66,666.67 (1,875 + 20% excess)
        // 40,000 - 33,333.33 = 6,666.67 * 0.20 = 1,333.334 + 1,875 = 3,208.33
        $this->assertEquals(3208.33, $this->statutoryService->calculateWithholdingTax(40000.00));

        // Bracket 4: 66,666.68 to 166,666.67 (8,541.67 + 25% excess)
        // 80,000 - 66,666.67 = 13,333.33 * 0.25 = 3,333.3325 + 8,541.67 = 11,875.00
        $this->assertEquals(11875.00, $this->statutoryService->calculateWithholdingTax(80000.00));

        // Bracket 5: 166,666.68 to 666,666.67 (33,541.67 + 30% excess)
        // 200,000 - 166,666.67 = 33,333.33 * 0.30 = 10,000.00 + 33,541.67 = 43,541.67
        $this->assertEquals(43541.67, $this->statutoryService->calculateWithholdingTax(200000.00));

        // Bracket 6: > 666,666.67 (183,541.67 + 35% excess)
        // 700,000 - 666,666.67 = 33,333.33 * 0.35 = 11,666.67 + 183,541.67 = 195,208.34
        $this->assertEquals(195208.34, $this->statutoryService->calculateWithholdingTax(700000.00));
    }

    public function test_calculate_all_deductions_aggregates_taxable_income_and_totals(): void
    {
        $baseSalary = 30000.00;
        $grossTaxablePay = 32000.00; // Base + 2000 OT

        // SSS EE: 4.5% of 30,000 = 1,350.00
        // PhilHealth EE: 2.5% of 30,000 = 750.00
        // Pag-IBIG EE: 200.00
        // Total Statutory EE: 1,350 + 750 + 200 = 2,300.00
        // Taxable Income: 32,000 - 2,300 = 29,700.00
        // Tax Bracket 2 (15% excess of 20,833.33):
        // (29,700 - 20,833.33) * 0.15 = 8,866.67 * 0.15 = 1,330.00
        $result = $this->statutoryService->calculateAll($baseSalary, $grossTaxablePay);

        $this->assertEquals(32000.00, $result['gross_pay']);
        $this->assertEquals(1350.00, $result['sss_ee']);
        $this->assertEquals(2850.00, $result['sss_er']);
        $this->assertEquals(750.00, $result['philhealth_ee']);
        $this->assertEquals(750.00, $result['philhealth_er']);
        $this->assertEquals(200.00, $result['pagibig_ee']);
        $this->assertEquals(200.00, $result['pagibig_er']);
        $this->assertEquals(2300.00, $result['total_statutory_ee']);
        $this->assertEquals(3800.00, $result['total_statutory_er']);
        $this->assertEquals(29700.00, $result['taxable_income']);
        $this->assertEquals(1330.00, $result['withholding_tax']);
        $this->assertEquals(3630.00, $result['total_employee_deductions']);
        $this->assertEquals(3800.00, $result['total_employer_contributions']);
    }

    public function test_payroll_calculator_preserves_attendance_only_when_disabled(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'payroll_working_days' => 20,
            'overtime_multiplier' => 1.50,
            'enable_statutory_deductions' => false,
        ]);

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Maria Clara',
            'role' => 'Weaver',
            'salary' => 20000.00,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(2),
        ]);

        $inputs = [
            'absences_days' => 1,
            'undertime_hours' => 2,
            'overtime_hours' => 4,
        ];

        $row = $this->payrollService->calculateEmployeeRow($employee, $inputs, $seller);

        // Daily: 20000 / 20 = 1000. Hourly: 1000 / 8 = 125.
        // OT: 4 * 125 * 1.5 = 750. Absences: 1000. Undertime: 250.
        // Net: 20000 + 750 - 1000 - 250 = 19500.00
        $this->assertEquals(19500.00, $row['net_pay']);
        $this->assertEquals(0.00, $row['sss_ee']);
        $this->assertEquals(0.00, $row['philhealth_ee']);
        $this->assertEquals(0.00, $row['pagibig_ee']);
        $this->assertEquals(0.00, $row['withholding_tax']);
        $this->assertEquals(0.00, $row['total_statutory_ee']);
        $this->assertEquals(0.00, $row['total_statutory_er']);
    }

    public function test_payroll_calculator_applies_statutory_deductions_when_enabled(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'payroll_working_days' => 20,
            'overtime_multiplier' => 1.25,
            'enable_statutory_deductions' => true,
        ]);

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Crisostomo Ibarra',
            'role' => 'Pottery Master',
            'salary' => 30000.00,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(3),
        ]);

        $inputs = [
            'absences_days' => 0,
            'undertime_hours' => 0,
            'overtime_hours' => 0,
        ];

        $row = $this->payrollService->calculateEmployeeRow($employee, $inputs, $seller);

        // Base: 30000. Gross: 30000.
        // SSS EE: 1,350. PhilHealth EE: 750. Pag-IBIG EE: 200. Total Stat EE: 2,300.
        // Taxable: 27,700.
        // Tax Bracket 2: (27,700 - 20,833.33) * 0.15 = 6,866.67 * 0.15 = 1,030.00
        // Net Pay: 30,000 - 2,300 - 1,030 = 26,670.00
        $this->assertEquals(30000.00, $row['gross_pay']);
        $this->assertEquals(1350.00, $row['sss_ee']);
        $this->assertEquals(2850.00, $row['sss_er']);
        $this->assertEquals(750.00, $row['philhealth_ee']);
        $this->assertEquals(750.00, $row['philhealth_er']);
        $this->assertEquals(200.00, $row['pagibig_ee']);
        $this->assertEquals(200.00, $row['pagibig_er']);
        $this->assertEquals(2300.00, $row['total_statutory_ee']);
        $this->assertEquals(3800.00, $row['total_statutory_er']);
        $this->assertEquals(27700.00, $row['taxable_income']);
        $this->assertEquals(1030.00, $row['withholding_tax']);
        $this->assertEquals(26670.00, $row['net_pay']);
    }

    public function test_seller_can_toggle_statutory_deductions_via_hr_settings(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'payroll_working_days' => 22,
            'enable_statutory_deductions' => false,
        ]);
        $seller->modules_enabled = ['hr' => true];
        $seller->save();

        $this->actingAs($seller);

        $response = $this->post(route('hr.settings'), [
            'payroll_working_days' => 22,
            'standard_workday_hours' => 8,
            'overtime_multiplier' => 1.25,
            'enable_statutory_deductions' => true,
        ]);

        $response->assertSessionHasNoErrors();
        $this->assertTrue((bool) $seller->fresh()->enable_statutory_deductions);

        // Turn off
        $response2 = $this->post(route('hr.settings'), [
            'payroll_working_days' => 22,
            'standard_workday_hours' => 8,
            'overtime_multiplier' => 1.25,
            'enable_statutory_deductions' => false,
        ]);

        $response2->assertSessionHasNoErrors();
        $this->assertFalse((bool) $seller->fresh()->enable_statutory_deductions);
    }

    public function test_payroll_generation_persists_statutory_deductions_in_database(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'payroll_working_days' => 20,
            'enable_statutory_deductions' => true,
        ]);
        $seller->modules_enabled = ['hr' => true];
        $seller->save();

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Basilio',
            'role' => 'Apprentice',
            'salary' => 20000.00,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        $this->actingAs($seller);

        $response = $this->post(route('hr.generate'), [
            'month' => 'November 2026',
            'items' => [
                [
                    'employee_id' => $employee->id,
                    'absences_days' => 0,
                    'paid_leave_days' => 0,
                    'undertime_hours' => 0,
                    'overtime_hours' => 0,
                    'rest_day_ot_hours' => 0,
                    'holiday_ot_hours' => 0,
                ],
            ],
        ]);

        $response->assertSessionHasNoErrors();

        $payroll = Payroll::where('user_id', $seller->id)->latest('id')->first();
        $this->assertNotNull($payroll);

        $item = PayrollItem::where('payroll_id', $payroll->id)->first();
        $this->assertNotNull($item);

        // Base: 20000. Gross: 20000.
        // SSS EE: 4.5% of 20000 = 900.00. SSS ER: 9.5% = 1900.00.
        // PhilHealth EE: 2.5% of 20000 = 500.00. PhilHealth ER: 2.5% = 500.00.
        // Pag-IBIG EE: 200.00. Pag-IBIG ER: 200.00.
        // Total Statutory EE: 1600.00. Taxable: 18400.00.
        // Taxable <= 20833.33 => Tax: 0.00.
        // Net: 20000 - 1600 = 18400.00.
        $this->assertEquals(20000.00, (float) $item->gross_pay);
        $this->assertEquals(900.00, (float) $item->sss_ee);
        $this->assertEquals(1900.00, (float) $item->sss_er);
        $this->assertEquals(500.00, (float) $item->philhealth_ee);
        $this->assertEquals(500.00, (float) $item->philhealth_er);
        $this->assertEquals(200.00, (float) $item->pagibig_ee);
        $this->assertEquals(200.00, (float) $item->pagibig_er);
        $this->assertEquals(0.00, (float) $item->withholding_tax);
        $this->assertEquals(18400.00, (float) $item->taxable_income);
        $this->assertEquals(18400.00, (float) $item->net_pay);

        // Verify HREmployeeLoader serialization
        $serialized = HREmployeeLoader::serializePayrollRun($payroll, $seller);
        $this->assertEquals(1600.00, $serialized['summary']['statutory_deductions']);
        $this->assertEquals(1600.00, $serialized['summary']['deductions']);
        $this->assertEquals(2600.00, $serialized['summary']['employer_contributions']);
        $this->assertEquals(18400.00, $serialized['summary']['net_pay']);
        $this->assertEquals(
            $serialized['summary']['net_pay'],
            $serialized['summary']['base_pay'] + $serialized['summary']['overtime'] - $serialized['summary']['deductions']
        );
    }

    public function test_serialized_payroll_run_preserves_statutory_fields_when_employee_is_deleted(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'payroll_working_days' => 20,
            'enable_statutory_deductions' => true,
        ]);

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Ghost Employee',
            'role' => 'Former Potter',
            'salary' => 20000.00,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(6),
        ]);

        $payroll = Payroll::create([
            'user_id' => $seller->id,
            'month' => 'December 2026',
            'status' => 'Paid',
            'total_amount' => 18400.00,
            'employee_count' => 1,
        ]);

        $item = PayrollItem::create([
            'payroll_id' => $payroll->id,
            'employee_id' => $employee->id,
            'base_salary' => 20000.00,
            'days_worked' => 20,
            'absences_days' => 0,
            'gross_pay' => 20000.00,
            'taxable_income' => 18400.00,
            'sss_ee' => 900.00,
            'sss_er' => 1900.00,
            'philhealth_ee' => 500.00,
            'philhealth_er' => 500.00,
            'pagibig_ee' => 200.00,
            'pagibig_er' => 200.00,
            'withholding_tax' => 0.00,
            'deductions' => 1600.00,
            'net_pay' => 18400.00,
        ]);

        // Simulate missing employee relation on item
        $item->setRelation('employee', null);
        $payroll->setRelation('items', collect([$item]));

        $serialized = HREmployeeLoader::serializePayrollRun($payroll, $seller);

        $lineItem = $serialized['line_items'][0];
        $this->assertEquals(900.00, $lineItem['sss_ee']);
        $this->assertEquals(1900.00, $lineItem['sss_er']);
        $this->assertEquals(500.00, $lineItem['philhealth_ee']);
        $this->assertEquals(500.00, $lineItem['philhealth_er']);
        $this->assertEquals(200.00, $lineItem['pagibig_ee']);
        $this->assertEquals(200.00, $lineItem['pagibig_er']);
        $this->assertEquals(1600.00, $lineItem['total_statutory_ee']);
        $this->assertEquals(2600.00, $lineItem['total_statutory_er']);
        $this->assertEquals(1600.00, $serialized['summary']['statutory_deductions']);
        $this->assertEquals(2600.00, $serialized['summary']['employer_contributions']);
    }

    public function test_accounting_csv_export_includes_employer_share(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'premium_tier' => 'premium',
            'payroll_working_days' => 20,
            'enable_statutory_deductions' => true,
        ]);
        $seller->modules_enabled = ['hr' => true, 'accounting' => true];
        $seller->save();

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Simoun',
            'role' => 'Master Gemologist',
            'salary' => 30000.00,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        $payroll = Payroll::create([
            'user_id' => $seller->id,
            'month' => 'January 2027',
            'status' => 'Pending',
            'total_amount' => 26670.00,
            'employee_count' => 1,
        ]);

        PayrollItem::create([
            'payroll_id' => $payroll->id,
            'employee_id' => $employee->id,
            'base_salary' => 30000.00,
            'days_worked' => 20,
            'absences_days' => 0,
            'gross_pay' => 30000.00,
            'taxable_income' => 27700.00,
            'sss_ee' => 1350.00,
            'sss_er' => 2850.00,
            'philhealth_ee' => 750.00,
            'philhealth_er' => 750.00,
            'pagibig_ee' => 200.00,
            'pagibig_er' => 200.00,
            'withholding_tax' => 1030.00,
            'deductions' => 3330.00,
            'net_pay' => 26670.00,
        ]);

        $response = $this->actingAs($seller)->get(route('accounting.export'));
        $response->assertOk();
        $content = $response->streamedContent();

        $this->assertStringContainsString('Employer Share', $content);
        $this->assertStringContainsString('3800', $content); // SSS ER (2850) + PhilHealth ER (750) + PagIBIG ER (200) = 3800
    }

    public function test_serialized_payroll_run_preserves_statutory_deductions_when_seller_disables_setting_later(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'payroll_working_days' => 20,
            'enable_statutory_deductions' => true,
        ]);

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Crisostomo Ibarra',
            'role' => 'Master Jeweler',
            'salary' => 20000.00,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        $payroll = Payroll::create([
            'user_id' => $seller->id,
            'month' => 'February 2027',
            'status' => 'Pending',
            'total_amount' => 18400.00,
            'employee_count' => 1,
        ]);

        PayrollItem::create([
            'payroll_id' => $payroll->id,
            'employee_id' => $employee->id,
            'base_salary' => 20000.00,
            'days_worked' => 20,
            'absences_days' => 0,
            'gross_pay' => 20000.00,
            'taxable_income' => 18400.00,
            'sss_ee' => 900.00,
            'sss_er' => 1900.00,
            'philhealth_ee' => 500.00,
            'philhealth_er' => 500.00,
            'pagibig_ee' => 200.00,
            'pagibig_er' => 200.00,
            'withholding_tax' => 0.00,
            'deductions' => 1600.00,
            'net_pay' => 18400.00,
        ]);

        // Workshop owner subsequently turns off statutory deductions
        $seller->enable_statutory_deductions = false;
        $seller->save();

        $serialized = HREmployeeLoader::serializePayrollRun($payroll->fresh(['items.employee']), $seller);

        $lineItem = $serialized['line_items'][0];
        $this->assertEquals(900.00, $lineItem['sss_ee']);
        $this->assertEquals(500.00, $lineItem['philhealth_ee']);
        $this->assertEquals(200.00, $lineItem['pagibig_ee']);
        $this->assertEquals(1600.00, $lineItem['total_statutory_ee']);
        $this->assertEquals(2600.00, $lineItem['total_statutory_er']);
        $this->assertEquals(1600.00, $lineItem['deductions']);
        $this->assertEquals(18400.00, $lineItem['net_pay']);
        $this->assertEquals(1600.00, $serialized['summary']['statutory_deductions']);
        $this->assertEquals(2600.00, $serialized['summary']['employer_contributions']);
        $this->assertEquals(1600.00, $serialized['summary']['deductions']);
        $this->assertTrue($lineItem['meta']['statutory_enabled']);
    }

    public function test_serialized_payroll_run_preserves_legacy_payroll_when_seller_enables_setting_later(): void
    {
        $seller = User::factory()->artisanApproved()->create([
            'payroll_working_days' => 20,
            'enable_statutory_deductions' => false,
        ]);

        $employee = Employee::create([
            'user_id' => $seller->id,
            'name' => 'Elias',
            'role' => 'Wood Sculptor',
            'salary' => 20000.00,
            'status' => 'Active',
            'join_date' => now(config('app.timezone'))->subMonths(1),
        ]);

        $payroll = Payroll::create([
            'user_id' => $seller->id,
            'month' => 'January 2026',
            'status' => 'Paid',
            'total_amount' => 20000.00,
            'employee_count' => 1,
        ]);

        // Legacy payroll item with null statutory fields
        PayrollItem::create([
            'payroll_id' => $payroll->id,
            'employee_id' => $employee->id,
            'base_salary' => 20000.00,
            'days_worked' => 20,
            'absences_days' => 0,
            'gross_pay' => null,
            'taxable_income' => null,
            'sss_ee' => null,
            'sss_er' => null,
            'philhealth_ee' => null,
            'philhealth_er' => null,
            'pagibig_ee' => null,
            'pagibig_er' => null,
            'withholding_tax' => null,
            'deductions' => 0.00,
            'net_pay' => 20000.00,
        ]);

        // Workshop owner enables statutory deductions months later
        $seller->enable_statutory_deductions = true;
        $seller->save();

        $serialized = HREmployeeLoader::serializePayrollRun($payroll->fresh(['items.employee']), $seller);

        $lineItem = $serialized['line_items'][0];
        $this->assertEquals(0.00, $lineItem['sss_ee']);
        $this->assertEquals(0.00, $lineItem['philhealth_ee']);
        $this->assertEquals(0.00, $lineItem['pagibig_ee']);
        $this->assertEquals(0.00, $lineItem['total_statutory_ee']);
        $this->assertEquals(0.00, $lineItem['total_statutory_er']);
        $this->assertEquals(0.00, $lineItem['deductions']);
        $this->assertEquals(20000.00, $lineItem['net_pay']);
        $this->assertEquals(0.00, $serialized['summary']['statutory_deductions']);
        $this->assertEquals(0.00, $serialized['summary']['employer_contributions']);
        $this->assertEquals(0.00, $serialized['summary']['deductions']);
        $this->assertFalse($lineItem['meta']['statutory_enabled']);
    }
}
