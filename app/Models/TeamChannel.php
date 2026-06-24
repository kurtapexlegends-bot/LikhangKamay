<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TeamChannel extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_owner_id',
        'name',
        'description',
        'created_by_id',
    ];

    public function sellerOwner()
    {
        return $this->belongsTo(User::class, 'seller_owner_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function members()
    {
        return $this->belongsToMany(User::class, 'team_channel_members', 'team_channel_id', 'user_id')
            ->withPivot('last_read_at')
            ->withTimestamps();
    }

    public function messages()
    {
        return $this->hasMany(TeamMessage::class, 'team_channel_id');
    }
}
