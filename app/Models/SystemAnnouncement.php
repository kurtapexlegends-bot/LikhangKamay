<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SystemAnnouncement extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'message',
        'icon_name',
        'bg_color',
        'text_color',
        'action_text',
        'action_url',
        'type',
        'target_audience',
        'is_active',
        'starts_at',
        'expires_at',
        'broadcast_version',
        'display_duration',
        'created_by'
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
        'broadcast_version' => 'integer',
    ];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}