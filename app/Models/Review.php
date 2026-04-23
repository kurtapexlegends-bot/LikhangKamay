<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'product_id',
        'rating',
        'comment',
        'photos',
        'seller_reply',
        'is_pinned',
        'is_hidden_from_marketplace',
        'hidden_at',
        'hidden_by',
    ];

    protected $casts = [
        'photos' => 'array',
        'is_pinned' => 'boolean',
        'is_hidden_from_marketplace' => 'boolean',
        'hidden_at' => 'datetime',
    ];

    protected $with = ['user']; // Eager load user by default

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function moderator()
    {
        return $this->belongsTo(User::class, 'hidden_by');
    }

    public function disputes()
    {
        return $this->hasMany(ReviewDispute::class)->latest();
    }

    public function scopeVisibleToMarketplace($query)
    {
        return $query->where('is_hidden_from_marketplace', false);
    }
}
