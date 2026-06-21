<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\User;

class PayrollCalculationService
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
        $otMultiplier = (float) ($seller->overtime_multiplier ?? 1.25);

        $absences = (float) ($inputs['absences_days'] ?? 0);
        $undertime = (float) ($inputs['undertime_hours'] ?? 0);
        $overtime = (float) ($inputs['overtime_hours'] ?? 0);

        $dailyRate = $employee->salary / $workingDays;
        $hourlyRate = $dailyRate / 8;

        // Overtime pay = overtime_hours * (hourly_rate * overtime_multiplier)
        $overtimePay = $overtime * ($hourlyRate * $otMultiplier);

        // Deductions
        $absenceDeduction = $absences * $dailyRate;
        $undertimeDeduction = $undertime * $hourlyRate;

        // Net Pay
        $netPay = max(0, $employee->salary + $overtimePay - $absenceDeduction - $undertimeDeduction);

        return [
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'role' => $employee->role,
            'base_salary' => $employee->salary,
            'days_worked' => max(0, $workingDays - $absences),
            'absences_days' => $absences,
            'absence_deduction' => round($absenceDeduction, 2),
            'undertime_hours' => $undertime,
            'undertime_deduction' => round($undertimeDeduction, 2),
            'overtime_hours' => $overtime,
            'overtime_pay' => round($overtimePay, 2),
            'net_pay' => round($netPay, 2),
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

            // Re-format for the UI/preview expectation
            $items[] = [
                'employee_name' => $employee->name,
                'role' => $employee->role,
                'base_salary' => $employee->salary,
                'overtime_pay' => $calculated['overtime_pay'],
                'deductions' => $calculated['absence_deduction'] + $calculated['undertime_deduction'],
                'net_pay' => $calculated['net_pay'],
                'meta' => [
                    'absences' => $calculated['absences_days'],
                    'overtime' => $calculated['overtime_hours'],
                    'undertime' => $calculated['undertime_hours'],
                ]
            ];
            $totalAmount += $calculated['net_pay'];
        }

        return [
            'items' => $items,
            'total_amount' => round($totalAmount, 2),
        ];
    }
}
