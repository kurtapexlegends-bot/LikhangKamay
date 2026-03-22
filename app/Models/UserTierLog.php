<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UserTierLog extends Model
{
    protected $fillable = [
        'user_id',
        'previous_tier',
        'new_tier',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
