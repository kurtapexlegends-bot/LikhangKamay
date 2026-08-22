<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    use HasFactory;

    protected $fillable = ['sender_id', 'receiver_id', 'message', 'attachment_path', 'attachment_type', 'is_read'];

    protected $casts = [
        'is_read' => \App\Casts\PostgresCompatibleBoolean::class,
    ];

    protected $appends = ['attachment_url'];

    public function getAttachmentUrlAttribute(): ?string
    {
        return $this->attachment_path ? \App\Services\StorageUrl::url($this->attachment_path) : null;
    }

    public function sender() {
        return $this->belongsTo(User::class, 'sender_id');
    }

    public function receiver() {
        return $this->belongsTo(User::class, 'receiver_id');
    }
}