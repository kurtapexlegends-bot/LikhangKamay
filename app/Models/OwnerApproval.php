<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * @property int $id
 * @property int $seller_id
 * @property int $requester_id
 * @property int|null $reviewer_id
 * @property string $domain
 * @property string|null $approvable_type
 * @property int|null $approvable_id
 * @property string $title
 * @property string|null $summary
 * @property array|null $changes_payload
 * @property string $status
 * @property string|null $rejection_reason
 * @property \Illuminate\Support\Carbon|null $reviewed_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read User $seller
 * @property-read User $requester
 * @property-read User|null $reviewer
 * @property-read Model|null $approvable
 */
class OwnerApproval extends Model
{
    use HasFactory;

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    public const DOMAIN_HR_PAYROLL = 'hr_payroll';
    public const DOMAIN_STAFF_RATE = 'staff_rate';
    public const DOMAIN_PROCUREMENT = 'procurement';
    public const DOMAIN_DISCOUNT = 'discount';
    public const DOMAIN_REFUND = 'refund';
    public const DOMAIN_PRODUCT_DRAFT = 'product_draft';

    protected $fillable = [
        'seller_id',
        'requester_id',
        'reviewer_id',
        'domain',
        'approvable_type',
        'approvable_id',
        'title',
        'summary',
        'changes_payload',
        'status',
        'rejection_reason',
        'reviewed_at',
    ];

    protected $casts = [
        'changes_payload' => 'array',
        'reviewed_at' => 'datetime',
    ];

    /**
     * The shop owner whom this approval belongs to.
     */
    public function seller(): BelongsTo
    {
        return $this->belongsTo(User::class, 'seller_id');
    }

    /**
     * The staff member who requested the change.
     */
    public function requester(): BelongsTo
    {
        return $this->belongsTo(User::class, 'requester_id');
    }

    /**
     * The shop owner or manager who reviewed the change.
     */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    /**
     * The target model being updated or created.
     */
    public function approvable(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Scope to pending items.
     */
    public function scopePending(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_PENDING);
    }

    /**
     * Scope to reviewed (approved or rejected) items.
     */
    public function scopeReviewed(Builder $query): Builder
    {
        return $query->whereIn('status', [self::STATUS_APPROVED, self::STATUS_REJECTED]);
    }

    /**
     * Scope to a specific business domain.
     */
    public function scopeForDomain(Builder $query, string $domain): Builder
    {
        return $query->where('domain', $domain);
    }
}
