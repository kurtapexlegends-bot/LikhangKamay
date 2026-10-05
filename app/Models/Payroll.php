<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Payroll extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'requested_by_user_id',
        'month',
        'total_amount',
        'employee_count',
        'status',
        'rejection_reason'
    ];

    public function user()
    {
        return $this->belongsTo(User::class)->withTrashed();
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id')->withTrashed();
    }

    public function items()
    {
        return $this->hasMany(PayrollItem::class);
    }

    public static function filterSchemaCompatibleAttributes(array $attributes): array
    {
        return $attributes;
    }
}