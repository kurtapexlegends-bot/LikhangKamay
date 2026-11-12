<?php

namespace App\Models;

use App\Casts\PostgresCompatibleBoolean;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\DB;

class Voucher extends Model
{
    use HasFactory, SoftDeletes;

    public const TYPE_PERCENTAGE = 'percentage';
    public const TYPE_FIXED_AMOUNT = 'fixed_amount';

    public const SCOPE_ALL = 'all';
    public const SCOPE_SPECIFIC_PRODUCTS = 'specific_products';
    public const SCOPE_CATEGORY = 'category';

    public const REQ_SPEND = 'spend';
    public const REQ_QUANTITY = 'quantity';

    public const AUDIENCE_ALL = 'all';
    public const AUDIENCE_FOLLOWERS = 'followers';
    public const AUDIENCE_NEW_CUSTOMERS = 'new_customers';
    public const AUDIENCE_REPEAT_CUSTOMERS = 'repeat_customers';

    protected $fillable = [
        'code',
        'name',
        'description',
        'shop_id',
        'discount_type',
        'scope_type',
        'applicable_products',
        'applicable_category',
        'discount_value',
        'min_spend',
        'min_requirement_type',
        'min_quantity',
        'max_discount',
        'usage_limit_total',
        'usage_limit_per_user',
        'used_count',
        'target_audience',
        'is_public',
        'is_active',
        'starts_at',
        'expires_at',
    ];

    protected $casts = [
        'shop_id' => 'integer',
        'discount_value' => 'decimal:2',
        'min_spend' => 'decimal:2',
        'min_quantity' => 'integer',
        'max_discount' => 'decimal:2',
        'applicable_products' => 'array',
        'usage_limit_total' => 'integer',
        'usage_limit_per_user' => 'integer',
        'used_count' => 'integer',
        'is_public' => PostgresCompatibleBoolean::class,
        'is_active' => PostgresCompatibleBoolean::class,
        'starts_at' => 'datetime',
        'expires_at' => 'datetime',
    ];

    protected $appends = [
        'status_label',
    ];

    protected static function booted(): void
    {
        static::saving(function (Voucher $voucher) {
            if ($voucher->code) {
                $voucher->code = strtoupper(trim((string) $voucher->code));
            }
        });
    }

    public function shop()
    {
        return $this->belongsTo(User::class, 'shop_id')->withTrashed();
    }

    public function redemptions()
    {
        return $this->hasMany(VoucherRedemption::class);
    }

    public function activeRedemptions()
    {
        return $this->hasMany(VoucherRedemption::class)->where('status', 'redeemed');
    }

    public function isShopVoucher(): bool
    {
        return $this->shop_id !== null;
    }

    public function getStatusLabelAttribute(): string
    {
        if (!$this->is_active) {
            return 'inactive';
        }

        $now = now();

        if ($this->starts_at !== null && $this->starts_at->isFuture()) {
            return 'upcoming';
        }

        if ($this->expires_at !== null && $this->expires_at->isPast()) {
            return 'expired';
        }

        if ($this->usage_limit_total !== null && $this->used_count >= $this->usage_limit_total) {
            return 'depleted';
        }

        return 'ongoing';
    }

    /**
     * Scope a query to only include currently active and redeemable vouchers.
     */
    public function scopeActive(Builder $query): Builder
    {
        $now = now();

        return $query->where('is_active', DB::raw('true'))
            ->where(function (Builder $q) use ($now) {
                $q->whereNull('starts_at')->orWhere('starts_at', '<=', $now);
            })
            ->where(function (Builder $q) use ($now) {
                $q->whereNull('expires_at')->orWhere('expires_at', '>=', $now);
            })
            ->where(function (Builder $q) {
                $q->whereNull('usage_limit_total')
                    ->orWhereColumn('used_count', '<', 'usage_limit_total');
            });
    }

    /**
     * Scope a query to public claimable vouchers.
     */
    public function scopePublic(Builder $query): Builder
    {
        return $query->where('is_public', DB::raw('true'));
    }
}
