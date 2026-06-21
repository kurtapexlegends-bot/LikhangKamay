<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

/**
 * @property int $id
 * @property int $user_id
 * @property int|null $requested_by_user_id
 * @property string $month
 * @property float|string $total_amount
 * @property int $employee_count
 * @property string $status
 * @property string|null $rejection_reason
 * @property string|null $run_number
 * @property string|null $notes
 * @property \Illuminate\Support\Carbon|null $pay_date
 * @property \Illuminate\Support\Carbon|null $submitted_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \Illuminate\Database\Eloquent\Collection|\App\Models\PayrollItem[] $items
 * @property-read \App\Models\User|null $user
 * @property-read \App\Models\User|null $requester
 */
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