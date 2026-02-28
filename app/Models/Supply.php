<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Supply extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
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

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function product(): BelongsTo
    {
        return $this->belongsTo(\App\Models\Product::class);
    }

    // Scope: Get supplies for a specific user
    public function scopeForUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    // Scope: Low stock items
    public function scopeLowStock($query)
    {
        return $query->whereColumn('quantity', '<=', 'min_stock');
    }

    // Scope: By category
    public function scopeByCategory($query, string $category)
    {
        return $query->where('category', $category);
    }

    public function isLowStock(): bool
    {
        return $this->quantity <= $this->min_stock;
    }

    // Accessor: Default max_stock to 500 if null
    public function getMaxStockAttribute($value)
    {
        return $value ?? 500;
    }

    // Phase 1: Capacity Check
    public function getAvailableCapacity(): int
    {
        return max(0, $this->max_stock - $this->quantity);
    }
}
