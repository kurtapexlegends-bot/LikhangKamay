<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payroll extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'month',
        'total_amount',
        'employee_count',
        'status',
        'rejection_reason'
    ];

    public function items()
    {
        return $this->hasMany(PayrollItem::class);
    }
}