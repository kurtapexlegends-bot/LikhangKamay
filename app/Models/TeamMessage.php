<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeamMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_owner_id',
        'sender_id',
        'receiver_id',
        'team_channel_id',
        'parent_id',
        'message',
        'attachment_path',
        'attachment_type',
        'is_read',
    ];

    protected function casts(): array
    {
        return [
            'is_read' => 'boolean',
        ];
    }

    public function sellerOwner()
    {
        return $this->belongsTo(User::class, 'seller_owner_id');
    }

    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }

    public function teamChannel()
    {
        return $this->belongsTo(TeamChannel::class, 'team_channel_id');
    }

    public function parent()
    {
        return $this->belongsTo(TeamMessage::class, 'parent_id');
    }

    public function replies()
    {
        return $this->hasMany(TeamMessage::class, 'parent_id');
    }
}
