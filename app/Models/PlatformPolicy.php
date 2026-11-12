<?php

declare(strict_types=1);

namespace App\Models;

use App\Casts\PostgresCompatibleBoolean;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlatformPolicy extends Model
{
    use HasFactory;

    public const TYPE_TERMS_OF_SERVICE = 'terms_of_service';
    public const TYPE_PRIVACY_POLICY = 'privacy_policy';
    public const TYPE_SELLER_AGREEMENT = 'seller_agreement';
    public const TYPE_SELLER_PRIVACY = 'seller_privacy';
    public const TYPE_RETURN_REFUND = 'return_refund_policy';

    public const ALL_TYPES = [
        self::TYPE_RETURN_REFUND,
        self::TYPE_TERMS_OF_SERVICE,
        self::TYPE_PRIVACY_POLICY,
        self::TYPE_SELLER_AGREEMENT,
        self::TYPE_SELLER_PRIVACY,
    ];

    protected $fillable = [
        'type',
        'title',
        'version',
        'content_markdown',
        'structured_criteria',
        'is_active',
        'published_at',
        'created_by',
    ];

    protected $casts = [
        'structured_criteria' => 'array',
        'is_active' => PostgresCompatibleBoolean::class,
        'published_at' => 'datetime',
    ];

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', PostgresCompatibleBoolean::dbVal(true));
    }

    public function scopeOfType(Builder $query, string $type): Builder
    {
        return $query->where('type', $type);
    }

    public function consents(): HasMany
    {
        return $this->hasMany(UserPolicyConsent::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }
}
