<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserTierLog extends Model
{
    protected $fillable = [
        'user_id',
        'previous_tier',
        'new_tier',
    ];
}
