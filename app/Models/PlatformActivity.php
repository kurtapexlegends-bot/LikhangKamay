<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlatformActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'action',
        'description',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public static function log(string $action, string $description, array $metadata = [])
    {
        return self::create([
            'user_id' => auth()->id(),
            'action' => $action,
            'description' => $description,
            'metadata' => $metadata,
        ]);
    }

    public static function logWithDiff(string $action, string $description, ?Model $subject = null, array $diff = [], ?int $actorId = null): self
    {
        return app(\App\Actions\Audit\RecordAuditActivity::class)->execute(
            action: $action,
            description: $description,
            subject: $subject,
            diff: $diff,
            actorId: $actorId,
        );
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function getSubjectTypeAttribute(): ?string
    {
        return $this->metadata['subject_type'] ?? null;
    }

    public function getSubjectIdAttribute(): int|string|null
    {
        return $this->metadata['subject_id'] ?? null;
    }

    public function getDiffAttribute(): array
    {
        return $this->metadata['diff'] ?? [];
    }

    public function getIpAddressAttribute(): ?string
    {
        return $this->metadata['ip_address'] ?? null;
    }

    public function scopeForSubject($query, string $type, int|string $id)
    {
        return $query->where('metadata->subject_type', $type)
            ->where(function ($q) use ($id) {
                $q->where('metadata->subject_id', (int) $id)
                    ->orWhere('metadata->subject_id', (string) $id);
            });
    }

    public function scopeForActor($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }
}