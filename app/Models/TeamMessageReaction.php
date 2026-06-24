<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeamMessageReaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'team_message_id',
        'user_id',
        'emoji',
    ];

    public function message()
    {
        return $this->belongsTo(TeamMessage::class, 'team_message_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
