<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payout extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'amount',
        'payout_method',
        'payout_account_name',
        'payout_account_number',
        'reference_number',
        'status',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
    ];

    /**
     * Get the user (artisan) that owns the payout.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
