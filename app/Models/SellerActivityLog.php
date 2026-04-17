<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class SellerActivityLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'seller_owner_id',
        'actor_user_id',
        'actor_type',
        'category',
        'module',
        'event_type',
        'severity',
        'status',
        'title',
        'summary',
        'subject_type',
        'subject_id',
        'subject_label',
        'reference',
        'amount_label',
        'details',
        'target_url',
        'target_label',
        'occurred_at',
    ];

    protected function casts(): array
    {
        return [
            'details' => 'array',
            'occurred_at' => 'datetime',
        ];
    }

    public function sellerOwner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_owner_id');
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_user_id');
    }

    /**
     * @param  array<string, mixed>  $attributes
     */
    public static function recordEvent(array $attributes): self
    {
        return static::create([
            'seller_owner_id' => $attributes['seller_owner_id'],
            'actor_user_id' => $attributes['actor_user_id'] ?? null,
            'actor_type' => $attributes['actor_type'] ?? null,
            'category' => $attributes['category'] ?? 'operations',
            'module' => $attributes['module'] ?? 'workspace',
            'event_type' => $attributes['event_type'] ?? 'updated',
            'severity' => $attributes['severity'] ?? 'info',
            'status' => $attributes['status'] ?? null,
            'title' => $attributes['title'],
            'summary' => $attributes['summary'],
            'subject_type' => $attributes['subject_type'] ?? null,
            'subject_id' => $attributes['subject_id'] ?? null,
            'subject_label' => $attributes['subject_label'] ?? null,
            'reference' => $attributes['reference'] ?? null,
            'amount_label' => $attributes['amount_label'] ?? null,
            'details' => $attributes['details'] ?? null,
            'target_url' => $attributes['target_url'] ?? null,
            'target_label' => $attributes['target_label'] ?? null,
            'occurred_at' => $attributes['occurred_at'] ?? now(),
        ]);
    }

    public static function resolveActorType(?User $actor, string $fallback = 'system'): string
    {
        if (!$actor) {
            return $fallback;
        }

        if ($actor->isAdmin()) {
            return 'admin';
        }

        if ($actor->isStaff()) {
            return 'staff';
        }

        if ($actor->isArtisan()) {
            return 'owner';
        }

        return 'buyer';
    }
}
