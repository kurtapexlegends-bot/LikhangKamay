<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
class StockRequest extends Model
{
    use HasFactory;

    const STATUS_PENDING = 'pending';

    const STATUS_ACCOUNTING_APPROVED = 'accounting_approved';
    const STATUS_ORDERED = 'ordered'; 
    const STATUS_PARTIALLY_RECEIVED = 'partially_received'; // <--- Added
    const STATUS_RECEIVED = 'received';
    const STATUS_COMPLETED = 'completed';
    const STATUS_REJECTED = 'rejected';

    const URGENCY_ROUTINE = 'routine';
    const URGENCY_SOON = 'soon';
    const URGENCY_IMMEDIATE = 'immediate';

    protected $fillable = [
        'user_id',
        'requested_by_user_id',
        'supply_id',
        'quantity',
        'total_cost',
        'status',
        'needed_by_date',
        'urgency_level',
        'notes',
        'received_quantity',
        'transferred_quantity',
        'rejection_reason',
    ];

    protected $casts = [
        'needed_by_date' => 'date:Y-m-d',
        'quantity' => 'integer',
        'total_cost' => 'decimal:2',
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

    public static function filterSchemaCompatibleAttributes(array $attributes): array
    {
        return $attributes;
    }
}
