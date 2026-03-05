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
    ];

    protected $casts = [
        'photos' => 'array',
        'is_pinned' => 'boolean',
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
}

