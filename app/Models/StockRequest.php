<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Schema;

class StockRequest extends Model
{
    use HasFactory;

    protected static ?bool $supportsRequestedByUserIdColumn = null;

    const STATUS_PENDING = 'pending';

    const STATUS_ACCOUNTING_APPROVED = 'accounting_approved';
    const STATUS_ORDERED = 'ordered'; 
    const STATUS_PARTIALLY_RECEIVED = 'partially_received'; // <--- Added
    const STATUS_RECEIVED = 'received';
    const STATUS_COMPLETED = 'completed';
    const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'user_id',
        'requested_by_user_id',
        'supply_id',
        'quantity',
        'total_cost',
        'status',
        'received_quantity',
        'transferred_quantity',
        'rejection_reason',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function requester()
    {
        return $this->belongsTo(User::class, 'requested_by_user_id');
    }

    public function supply()
    {
        return $this->belongsTo(Supply::class);
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
