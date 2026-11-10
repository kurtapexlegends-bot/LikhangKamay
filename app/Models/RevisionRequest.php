<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class RevisionRequest extends Model
{
    protected $fillable = [
        'revisable_type',
        'revisable_id',
        'reviewer_id',
        'revision_items',
        'summary_note',
        'resolved_at',
    ];

    protected $casts = [
        'revision_items' => 'array',
        'resolved_at' => 'datetime',
    ];

    public function revisable(): MorphTo
    {
        return $this->morphTo();
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id')->withTrashed();
    }
}
