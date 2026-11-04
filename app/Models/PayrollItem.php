<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $payroll_id
 * @property int $employee_id
 * @property float|string $base_salary
 * @property float $days_worked
 * @property float $absences_days
 * @property float $undertime_hours
 * @property float $overtime_hours
 * @property float $overtime_pay
 * @property float $rest_day_ot_hours
 * @property float $rest_day_ot_pay
 * @property float $holiday_ot_hours
 * @property float $holiday_ot_pay
 * @property float $paid_leave_days
 * @property float $deductions
 * @property float $bonus
 * @property float $net_pay
 * @property-read \App\Models\Payroll $payroll
 * @property-read \App\Models\Employee|null $employee
 */
class PayrollItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'payroll_id',
        'employee_id',
        'base_salary',
        'days_worked',
        'absences_days',
        'undertime_hours',
        'overtime_hours',
        'overtime_pay',
        'rest_day_ot_hours',
        'rest_day_ot_pay',
        'holiday_ot_hours',
        'holiday_ot_pay',
        'paid_leave_days',
        'gross_pay',
        'taxable_income',
        'sss_ee',
        'sss_er',
        'philhealth_ee',
        'philhealth_er',
        'pagibig_ee',
        'pagibig_er',
        'withholding_tax',
        'deductions',
        'bonus',
        'net_pay'
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'gross_pay' => 'float',
            'taxable_income' => 'float',
            'sss_ee' => 'float',
            'sss_er' => 'float',
            'philhealth_ee' => 'float',
            'philhealth_er' => 'float',
            'pagibig_ee' => 'float',
            'pagibig_er' => 'float',
            'withholding_tax' => 'float',
        ];
    }

    public static function filterSchemaCompatibleAttributes(array $attributes): array
    {
        $absenceDeduction = (float) ($attributes['absence_deduction'] ?? 0);
        $undertimeDeduction = (float) ($attributes['undertime_deduction'] ?? 0);
        $statutoryEe = (float) (
            ($attributes['sss_ee'] ?? 0) +
            ($attributes['philhealth_ee'] ?? 0) +
            ($attributes['pagibig_ee'] ?? 0) +
            ($attributes['withholding_tax'] ?? 0)
        );

        unset($attributes['absence_deduction'], $attributes['undertime_deduction']);

        if (!isset($attributes['deductions'])) {
            $attributes['deductions'] = round($absenceDeduction + $undertimeDeduction + $statutoryEe, 2);
        }
        $attributes['bonus'] = (float) ($attributes['bonus'] ?? 0);

        return $attributes;
    }

    public function payroll()
    {
        return $this->belongsTo(Payroll::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class)->withTrashed();
    }
    public static function forgetSchemaSupportCache(): void
    {
        // No-op for compatibility
    }
}
