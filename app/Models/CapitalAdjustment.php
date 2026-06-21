<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CapitalAdjustment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'adjusted_by_user_id',
        'previous_amount',
        'new_amount',
        'memo',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function adjustedBy()
    {
        return $this->belongsTo(User::class, 'adjusted_by_user_id');
    }
}
