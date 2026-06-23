<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerAnalyticsSnapshot extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_id',
        'snapshot_date',
        'revenue',
        'cost',
        'orders_count',
    ];

    protected $casts = [
        'snapshot_date' => 'date',
        'revenue' => 'float',
        'cost' => 'float',
        'orders_count' => 'integer',
    ];

    /**
     * Get the seller associated with this snapshot.
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }
}
