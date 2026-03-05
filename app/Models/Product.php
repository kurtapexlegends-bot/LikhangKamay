<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id', 'sku', 'name', 'description', 'category', 'status',
        'clay_type', 'glaze_type', 'firing_method', 'food_safe', 'colors',
        'height', 'width', 'weight',
        'price', 'cost_price', 'stock', 'lead_time', 'sold',
        'cover_photo_path', 'gallery_paths', 'model_3d_path', 'slug',
        'track_as_supply',
        'is_sponsored', 'sponsored_until'
    ];

    protected $casts = [
        'food_safe' => 'boolean',
        'track_as_supply' => 'boolean',
        'is_sponsored' => 'boolean',
        'sponsored_until' => 'datetime',
        'colors' => 'array',
        'gallery_paths' => 'array',
        'has3D' => 'boolean',
    ];

    // Helper to check if it has a 3D model (for Frontend)
    protected $appends = ['img', 'has3D', 'rating', 'reviews_count'];

    public function getImgAttribute()
    {
        return $this->cover_photo_path 
            ? '/storage/' . $this->cover_photo_path 
            : '/images/placeholder.svg';
    }

    public function getHas3DAttribute()
    {
        return !empty($this->model_3d_path);
    }

    public function getRatingAttribute()
    {
        if ($this->relationLoaded('reviews')) {
            return $this->reviews->avg('rating') ? round($this->reviews->avg('rating'), 1) : 0;
        }
        return round($this->reviews()->avg('rating'), 1) ?? 0;
    }

    public function getReviewsCountAttribute()
    {
        if ($this->relationLoaded('reviews')) {
            return $this->reviews->count();
        }
        return $this->reviews()->count();
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class)->latest();
    }

    public function supply()
    {
        return $this->hasOne(Supply::class);
    }

    public function sponsorshipRequests()
    {
        return $this->hasMany(SponsorshipRequest::class);
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($product) {
            $product->slug = \Illuminate\Support\Str::slug($product->name . '-' . \Illuminate\Support\Str::random(6));
        });

        static::updating(function ($product) {
            if ($product->isDirty('name')) {
                 $product->slug = \Illuminate\Support\Str::slug($product->name . '-' . \Illuminate\Support\Str::random(6));
            }
        });
    }

    /**
     * Get the route key for the model.
     */
    public function getRouteKeyName()
    {
        return 'slug';
    }
}