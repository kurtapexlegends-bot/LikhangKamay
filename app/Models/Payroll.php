<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class Payroll extends Model
{
    use HasFactory;

    protected static ?bool $supportsRequestedByUserIdColumn = null;

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
        return $this->belongsTo(User::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function items()
    {
        return $this->hasMany(PayrollItem::class);
    }

    public static function supportsRequestedByUserIdColumn(): bool
    {
        if (static::$supportsRequestedByUserIdColumn === null) {
            static::$supportsRequestedByUserIdColumn = Schema::hasColumn((new static())->getTable(), 'requested_by_user_id');
        }

        return static::$supportsRequestedByUserIdColumn;
    }

    public static function filterSchemaCompatibleAttributes(array $attributes): array
    {
        if (!static::supportsRequestedByUserIdColumn()) {
            unset($attributes['requested_by_user_id']);
        }

        return $attributes;
    }
}