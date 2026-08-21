<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmailTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'slug',
        'name',
        'subject',
        'headline',
        'body',
        'button_label',
        'button_url',
        'category',
        'is_active',
        'created_by_user_id',
    ];

    protected $casts = [
        'is_active' => \App\Casts\PostgresCompatibleBoolean::class,
    ];

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
