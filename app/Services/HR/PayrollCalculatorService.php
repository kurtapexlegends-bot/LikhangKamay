<?php

namespace App\Services\HR;

use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\User;
use App\Support\HRWorkflowHelper;
use Illuminate\Support\Facades\DB;

class PayrollCalculatorService
{
    /**
     * Compute a payroll item for a single employee based on monthly inputs.
     *
     * @param Employee $employee
     * @param array $inputs  ['absences_days' => float, 'undertime_hours' => float, 'overtime_hours' => float]
     * @param User $seller
     * @return array
     */
    public function calculateEmployeeRow(Employee $employee, array $inputs, User $seller): array
    {
        $workingDays = max((int) ($seller->payroll_working_days ?? 22), 1);
        $factorMethod = (string) ($seller->payroll_factor_method ?? 'custom');
        $otMultiplier = (float) ($seller->overtime_multiplier ?? 1.25);
        $restDayOtMultiplier = (float) ($seller->rest_day_ot_multiplier ?? 1.69);
        $holidayOtMultiplier = (float) ($seller->holiday_ot_multiplier ?? 2.60);

        $absences = (float) ($inputs['absences_days'] ?? 0);
        $paidLeaves = (float) ($inputs['paid_leave_days'] ?? 0);
        $undertime = (float) ($inputs['undertime_hours'] ?? 0);
        $overtime = (float) ($inputs['overtime_hours'] ?? 0);
        $restDayOt = (float) ($inputs['rest_day_ot_hours'] ?? 0);
        $holidayOt = (float) ($inputs['holiday_ot_hours'] ?? 0);

        // Daily Rate calculations matching EEMR
        if ($factorMethod === '261') {
            $dailyRate = ($employee->salary * 12) / 261;
            $workingDaysCount = 261.0 / 12.0;
        } elseif ($factorMethod === '313') {
            $dailyRate = ($employee->salary * 12) / 313;
            $workingDaysCount = 313.0 / 12.0;
        } else {
            $dailyRate = $employee->salary / $workingDays;
            $workingDaysCount = (float) $workingDays;
        }

        $standardWorkdayHours = (float) ($seller->standard_workday_hours ?? 8.0);
        $hourlyRate = $dailyRate / $standardWorkdayHours;

        // Tiered Overtime Pay
        $overtimePay = $overtime * ($hourlyRate * $otMultiplier);
        $restDayOtPay = $restDayOt * ($hourlyRate * $restDayOtMultiplier);
        $holidayOtPay = $holidayOt * ($hourlyRate * $holidayOtMultiplier);
        $totalOtPay = $overtimePay + $restDayOtPay + $holidayOtPay;

        // Deductions (unpaid absences only)
        $absenceDeduction = $absences * $dailyRate;
        $undertimeDeduction = $undertime * $hourlyRate;
        $totalDeductions = $absenceDeduction + $undertimeDeduction;

        // Net Pay
        $netPay = max(0, $employee->salary + $totalOtPay - $totalDeductions);

        return [
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'role' => $employee->role,
            'base_salary' => $employee->salary,
            'days_worked' => max(0, round($workingDaysCount - $absences, 1)),
            'absences_days' => $absences,
            'paid_leave_days' => $paidLeaves,
            'absence_deduction' => round($absenceDeduction, 2),
            'undertime_hours' => $undertime,
            'undertime_deduction' => round($undertimeDeduction, 2),
            'overtime_hours' => $overtime,
            'overtime_pay' => round($overtimePay, 2),
            'rest_day_ot_hours' => $restDayOt,
            'rest_day_ot_pay' => round($restDayOtPay, 2),
            'holiday_ot_hours' => $holidayOt,
            'holiday_ot_pay' => round($holidayOtPay, 2),
            'net_pay' => round($netPay, 2),
            'meta' => [
                'daily_rate' => round($dailyRate, 2),
                'hourly_rate' => round($hourlyRate, 2),
                'factor_method' => $factorMethod,
                'working_days' => $workingDaysCount,
                'overtime_multiplier' => $otMultiplier,
                'rest_day_ot_multiplier' => $restDayOtMultiplier,
                'holiday_ot_multiplier' => $holidayOtMultiplier,
                'absences' => $absences,
                'paid_leaves' => $paidLeaves,
                'overtime' => $overtime,
                'rest_day_ot' => $restDayOt,
                'holiday_ot' => $holidayOt,
                'undertime' => $undertime,
            ]
        ];
    }

    /**
     * Calculate multiple payroll items.
     *
     * @param array $selectedItems Array of item arrays with inputs
     * @param User $seller
     * @return array
     */
    public function calculatePayrollItems(array $selectedItems, User $seller): array
    {
        $items = [];
        $totalAmount = 0;

        foreach ($selectedItems as $item) {
            $employee = Employee::where('user_id', $seller->id)->findOrFail($item['employee_id']);
            $calculated = $this->calculateEmployeeRow($employee, $item, $seller);

            // Structure to pass comprehensive details to frontend preview
            $items[] = [
                'employee_id' => $calculated['employee_id'],
                'employee_name' => $calculated['employee_name'],
                'role' => $calculated['role'],
                'base_salary' => $calculated['base_salary'],
                'days_worked' => $calculated['days_worked'],
                'absences_days' => $calculated['absences_days'],
                'paid_leave_days' => $calculated['paid_leave_days'],
                'absence_deduction' => $calculated['absence_deduction'],
                'undertime_hours' => $calculated['undertime_hours'],
                'undertime_deduction' => $calculated['undertime_deduction'],
                'overtime_hours' => $calculated['overtime_hours'],
                'overtime_pay' => $calculated['overtime_pay'],
                'rest_day_ot_hours' => $calculated['rest_day_ot_hours'],
                'rest_day_ot_pay' => $calculated['rest_day_ot_pay'],
                'holiday_ot_hours' => $calculated['holiday_ot_hours'],
                'holiday_ot_pay' => $calculated['holiday_ot_pay'],
                'deductions' => round($calculated['absence_deduction'] + $calculated['undertime_deduction'], 2),
                'net_pay' => $calculated['net_pay'],
                'meta' => $calculated['meta'],
            ];
            $totalAmount += $calculated['net_pay'];
        }

        return [
            'items' => $items,
            'total_amount' => round($totalAmount, 2),
        ];
    }

    /**
     * Dry run calculation response mapping.
     */
    public function dryRun(array $selectedItems, User $seller, string $month): array
    {
        $calcResults = $this->calculatePayrollItems($selectedItems, $seller);
        return [
            'success' => true,
            'data' => [
                'month' => $month,
                'total_amount' => $calcResults['total_amount'],
                'employee_count' => count($calcResults['items']),
                'items' => $calcResults['items'],
            ]
        ];
    }

    /**
     * Generate payroll in database with full transaction safety.
     */
    public function generate(array $selectedItems, User $seller, User $actor, array $validated): Payroll
    {
        return DB::transaction(function () use ($validated, $selectedItems, $seller, $actor) {
            $totalAmount = 0;
            $employeeCount = count($selectedItems);
            $sellerId = $seller->id;
            $action = $validated['action'] ?? 'submit';
            $isDraft = $action === 'draft';

            $payroll = Payroll::create(Payroll::filterSchemaCompatibleAttributes([
                'user_id' => $sellerId,
                'requested_by_user_id' => $actor->id,
                'month' => $validated['month'],
                'pay_date' => $validated['pay_date'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'total_amount' => 0,
                'employee_count' => $employeeCount,
                'status' => $isDraft ? 'Draft' : 'Pending',
                'submitted_at' => $isDraft ? null : now(config('app.timezone')),
            ]));

            foreach ($selectedItems as $item) {
                $employee = Employee::where('user_id', $sellerId)->findOrFail($item['employee_id']);

                $calculated = $this->calculateEmployeeRow($employee, $item, $seller);

                PayrollItem::create(PayrollItem::filterSchemaCompatibleAttributes([
                    'payroll_id' => $payroll->id,
                    'employee_id' => $employee->id,
                    'base_salary' => $calculated['base_salary'],
                    'days_worked' => round($calculated['days_worked']),
                    'absences_days' => round($calculated['absences_days']),
                    'paid_leave_days' => round($calculated['paid_leave_days']),
                    'undertime_hours' => $calculated['undertime_hours'],
                    'undertime_deduction' => $calculated['undertime_deduction'],
                    'overtime_hours' => $calculated['overtime_hours'],
                    'overtime_pay' => $calculated['overtime_pay'],
                    'rest_day_ot_hours' => $calculated['rest_day_ot_hours'],
                    'rest_day_ot_pay' => $calculated['rest_day_ot_pay'],
                    'holiday_ot_hours' => $calculated['holiday_ot_hours'],
                    'holiday_ot_pay' => $calculated['holiday_ot_pay'],
                    'absence_deduction' => $calculated['absence_deduction'],
                    'bonus' => 0,
                    'net_pay' => $calculated['net_pay'],
                ]));

                $totalAmount += $calculated['net_pay'];
            }

            $payroll->update(['total_amount' => round($totalAmount, 2)]);

            if (!$isDraft) {
                HRWorkflowHelper::notifyAccountingOfPayrollRun($payroll, $seller, $validated['month'], $actor);
            }

            return $payroll;
        });
    }
}
