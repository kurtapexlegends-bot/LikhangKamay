<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

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
        'deductions',
        'bonus',
        'net_pay'
    ];

    public static function supportsAbsencesDaysColumn(): bool
    {
        return Schema::hasColumn((new static())->getTable(), 'absences_days');
    }

    public static function supportsUndertimeHoursColumn(): bool
    {
        return Schema::hasColumn((new static())->getTable(), 'undertime_hours');
    }

    public static function supportsDeductionsColumn(): bool
    {
        return Schema::hasColumn((new static())->getTable(), 'deductions');
    }

    public static function supportsBonusColumn(): bool
    {
        return Schema::hasColumn((new static())->getTable(), 'bonus');
    }

    public static function forgetSchemaSupportCache(): void
    {
        // No-op. Payroll item schema checks are evaluated directly to stay safe
        // across legacy/current schema variants and test-time schema changes.
    }

    public static function filterSchemaCompatibleAttributes(array $attributes): array
    {
        $absenceDeduction = (float) ($attributes['absence_deduction'] ?? 0);
        $undertimeDeduction = (float) ($attributes['undertime_deduction'] ?? 0);

        unset($attributes['absence_deduction'], $attributes['undertime_deduction']);

        if (!static::supportsAbsencesDaysColumn()) {
            unset($attributes['absences_days']);
        }

        if (!static::supportsUndertimeHoursColumn()) {
            unset($attributes['undertime_hours']);
        }

        if (static::supportsDeductionsColumn()) {
            $attributes['deductions'] = round($absenceDeduction + $undertimeDeduction, 2);
        }

        if (!static::supportsDeductionsColumn()) {
            unset($attributes['deductions']);
        }

        if (static::supportsBonusColumn()) {
            $attributes['bonus'] = (float) ($attributes['bonus'] ?? 0);
        }

        if (!static::supportsBonusColumn()) {
            unset($attributes['bonus']);
        }

        return $attributes;
    }

    public function payroll()
    {
        return $this->belongsTo(Payroll::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
