<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Discount extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'name',
        'type',
        'value',
        'promo_stock',
        'promo_sold',
        'max_purchase_limit',
        'start_at',
        'end_at',
        'is_active',
    ];

    protected $casts = [
        'value' => 'float',
        'promo_stock' => 'integer',
        'promo_sold' => 'integer',
        'max_purchase_limit' => 'integer',
        'start_at' => 'datetime',
        'end_at' => 'datetime',
        'is_active' => \App\Casts\PostgresCompatibleBoolean::class,
    ];

    protected $appends = ['is_currently_active', 'remaining_promo_stock'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function products()
    {
        return $this->belongsToMany(Product::class, 'discount_product');
    }

    public function scopeActive($query)
    {
        $now = now();
        return $query->where('is_active', true)
                    ->where('start_at', '<=', $now)
                    ->where('end_at', '>=', $now)
                    ->where(function ($q) {
                        $q->whereNull('promo_stock')
                          ->orWhereColumn('promo_sold', '<', 'promo_stock');
                    });
    }

    public function getIsCurrentlyActiveAttribute(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $now = now();
        if ($this->start_at > $now || $this->end_at < $now) {
            return false;
        }

        if ($this->promo_stock !== null && $this->promo_sold >= $this->promo_stock) {
            return false;
        }

        return true;
    }

    public function getRemainingPromoStockAttribute(): ?int
    {
        if ($this->promo_stock === null) {
            return null;
        }

        return max(0, $this->promo_stock - ($this->promo_sold ?? 0));
    }

    /**
     * Calculate discounted price for a given original price
     */
    public function calculateDiscountedPrice(float $originalPrice): float
    {
        if ($this->type === 'percentage') {
            $discountAmount = $originalPrice * ($this->value / 100);
            return max(0, round($originalPrice - $discountAmount, 2));
        }

        // Fixed price or fixed amount off.
        if ($this->value < $originalPrice) {
            return max(0, round($this->value, 2));
        }

        return max(0, round($originalPrice - $this->value, 2));
    }
}
