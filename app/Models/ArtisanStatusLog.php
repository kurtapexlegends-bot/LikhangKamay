<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ArtisanStatusLog extends Model
{
    protected $fillable = [
        'user_id',
        'previous_status',
        'new_status',
    ];
}
