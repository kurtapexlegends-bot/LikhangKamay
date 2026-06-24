<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeamChannelMember extends Model
{
    use HasFactory;

    protected $table = 'team_channel_members';

    protected $fillable = [
        'team_channel_id',
        'user_id',
        'last_read_at',
    ];

    protected function casts(): array
    {
        return [
            'last_read_at' => 'datetime',
        ];
    }

    public function channel()
    {
        return $this->belongsTo(TeamChannel::class, 'team_channel_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
