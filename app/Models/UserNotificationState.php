<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserNotificationState extends Model
{
    protected $fillable = [
        'user_id',
        'notification_id',
        'read_at',
        'deleted_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
