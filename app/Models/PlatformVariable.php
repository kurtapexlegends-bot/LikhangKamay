<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformVariable extends Model
{
    protected $fillable = [
        'key',
        'value',
        'type',
        'description',
    ];
}
