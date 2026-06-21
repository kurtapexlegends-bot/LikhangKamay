<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $seller_owner_id
 * @property int $actor_user_id
 * @property int|null $staff_user_id
 * @property int $employee_id
 * @property string $event
 * @property string $summary
 * @property array|null $details
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read \App\Models\User $sellerOwner
 * @property-read \App\Models\User $actor
 * @property-read \App\Models\User|null $staffUser
 * @property-read \App\Models\Employee $employee
 */
class StaffAccessAudit extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_owner_id',
        'actor_user_id',
        'staff_user_id',
        'employee_id',
        'event',
        'summary',
        'details',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
        ];
    }

    public function sellerOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_owner_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    public function staffUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'staff_user_id');
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
