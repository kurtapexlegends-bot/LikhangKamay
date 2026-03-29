<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

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
        'net_pay'
    ];

    public function payroll()
    {
        return $this->belongsTo(Payroll::class);
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class);
    }
}
