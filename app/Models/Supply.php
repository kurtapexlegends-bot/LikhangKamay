<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Supply extends Model
{
    public const CATEGORIES = ['Finished Goods', 'Tools', 'Packaging', 'Glazes', 'Other'];
    public const UNITS = ['pcs', 'kg', 'liters', 'bags', 'boxes', 'sets'];

    protected $fillable = [
        'user_id',
        'product_id',
        'sku',
        'name',
        'category',
        'quantity',
        'unit',
        'min_stock',
        'unit_cost',
        'supplier',
        'notes',
        'max_stock', // Phase 1
    ];

    protected $casts = [
        'unit_cost' => 'decimal:2',
        'quantity' => 'integer',
        'min_stock' => 'integer',
    ];

    protected static function booted()
    {
        static::updated(function (Supply $supply) {
            if ($supply->wasChanged('quantity')) {
                if ($supply->quantity == 0) {
                    $supply->user->notify(new \App\Notifications\SupplyDepletedNotification($supply));
                } elseif ($supply->quantity <= $supply->min_stock && $supply->getOriginal('quantity') > $supply->min_stock) {
                    $supply->user->notify(new \App\Notifications\LowStockWarningNotification($supply));
                }
            }
        });
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Product::class, 'product_id');
    }

    // Scope: Get supplies for a specific user
    public function scopeForUser(\Illuminate\Database\Eloquent\Builder $query, int|string $userId)
    {
        return $query->where('user_id', $userId);
    }

    // Scope: Low stock items
    public function scopeLowStock(\Illuminate\Database\Eloquent\Builder $query)
    {
        return $query->whereColumn('quantity', '<=', 'min_stock');
    }

    // Scope: By category
    public function scopeByCategory(\Illuminate\Database\Eloquent\Builder $query, string $category)
    {
        return $query->where('category', $category);
    }

    public function isLowStock(): bool
    {
        return $this->quantity <= $this->min_stock;
    }

    // Accessor: Default max_stock to 500 if null
    public function getMaxStockAttribute(?int $value)
    {
        return $value ?? 500;
    }

    // Phase 1: Capacity Check
    public function getAvailableCapacity(): int
    {
        return max(0, $this->max_stock - $this->quantity);
    }

    public static function filterSchemaCompatibleAttributes(array $attributes): array
    {
        return $attributes;
    }

    public static function supportsProductIdColumn(): bool
    {
        return true;
    }

    public static function supportsMaxStockColumn(): bool
    {
        return true;
    }
}
