<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

use App\Traits\Searchable;
use App\Traits\HasTransformableImages;

/**
 * @property int $id
 * @property int $user_id
 * @property string $sku
 * @property string $name
 * @property string|null $description
 * @property string $category
 * @property string $status
 * @property string|null $clay_type
 * @property string|null $glaze_type
 * @property string|null $firing_method
 * @property bool $food_safe
 * @property array|null $colors
 * @property float|null $height
 * @property float|null $width
 * @property float|null $weight
 * @property float $price
 * @property float|null $cost_price
 * @property int $stock
 * @property int|null $lead_time
 * @property int $sold
 * @property string|null $cover_photo_path
 * @property array|null $gallery_paths
 * @property string|null $model_3d_path
 * @property string $slug
 * @property bool $track_as_supply
 * @property string|null $production_method
 * @property-read string $img
 * @property-read bool $has3D
 * @property-read float $rating
 * @property-read int $reviews_count
 */
class Product extends Model
{
    use HasFactory, SoftDeletes, HasTransformableImages, Searchable;

    public static $bypassReview = false;

    protected $fillable = [
        'user_id', 'sku', 'name', 'description', 'category', 'status',
        'clay_type', 'glaze_type', 'firing_method', 'food_safe', 'colors',
        'height', 'width', 'weight',
        'price', 'cost_price', 'stock', 'lead_time', 'sold',
        'cover_photo_path', 'gallery_paths', 'model_3d_path', 'slug',
        'track_as_supply', 'is_sponsored', 'sponsored_until', 'production_method',
        'rejection_reason'
    ];

    protected $casts = [
        'food_safe' => 'boolean',
        'track_as_supply' => 'boolean',
        'is_sponsored' => 'boolean',
        'sponsored_until' => 'datetime',
        'colors' => 'array',        // Automatically converts JSON to Array
        'gallery_paths' => 'array', // Automatically converts JSON to Array
        'has3D' => 'boolean',       // Computed accessor (logic below)
    ];

    // Helper to check if it has a 3D model (for Frontend)
    protected $appends = ['img', 'has3D'];

    public function getImgAttribute()
    {
        if (!$this->cover_photo_path) return '/images/placeholder.svg';
        
        // Use Supabase Transformation to request a 600px width version
        return $this->getTransformedUrl($this->cover_photo_path, [
            'width' => 600,
            'quality' => 80,
            'format' => 'webp'
        ]);
    }

    public function getHas3DAttribute()
    {
        return !empty($this->model_3d_path);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class)->latest();
    }

    public function publicReviews()
    {
        return $this->hasMany(Review::class)->visibleToMarketplace()->latest();
    }

    public function supply()
    {
        $relation = Supply::supportsProductIdColumn()
            ? $this->hasOne(Supply::class)
            : $this->hasOne(Supply::class, 'name', 'name')->where('user_id', $this->user_id);

        return $relation;
    }

    public function sponsorshipRequests()
    {
        return $this->hasMany(SponsorshipRequest::class);
    }

    public function recipes()
    {
        return $this->hasMany(ProductRecipe::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($product) {
            $product->slug = \Illuminate\Support\Str::slug($product->name . '-' . \Illuminate\Support\Str::random(6));
            if (!static::$bypassReview) {
                $user = \Illuminate\Support\Facades\Auth::guard()->user();
                if ($user && ($user->role === 'artisan' || $user->role === 'staff')) {
                    if ($product->status === 'Active') {
                        $product->status = 'pending_review';
                        $product->rejection_reason = null;
                    }
                }
            }
        });

        static::updating(function ($product) {
            if ($product->isDirty('name')) {
                 $product->slug = \Illuminate\Support\Str::slug($product->name . '-' . \Illuminate\Support\Str::random(6));
            }
            if (!static::$bypassReview) {
                $user = \Illuminate\Support\Facades\Auth::guard()->user();
                if ($user && ($user->role === 'artisan' || $user->role === 'staff')) {
                    if ($product->status !== 'Draft' && $product->status !== 'Archived') {
                        $product->status = 'pending_review';
                        $product->rejection_reason = null;
                    }
                }
            }
        });

        static::saved(function ($product) {
            \Illuminate\Support\Facades\Cache::forget('shop_catalog_default_page_1');
            \Illuminate\Support\Facades\Cache::forget("seller_{$product->user_id}_products");
            \Illuminate\Support\Facades\Cache::forget("seller_{$product->user_id}_best_sellers");
            \Illuminate\Support\Facades\Cache::forget("seller_{$product->user_id}_stats");
            \Illuminate\Support\Facades\Cache::forget('catalog_materials');
            \Illuminate\Support\Facades\Cache::forget('catalog_locations');
            \Illuminate\Support\Facades\Cache::forget('catalog_categories');
            \Illuminate\Support\Facades\Cache::forget('home_sponsored_products');
            \Illuminate\Support\Facades\Cache::forget('home_featured_products_pool');
            \Illuminate\Support\Facades\Cache::forget('home_top_sellers');
            \Illuminate\Support\Facades\Cache::forget('home_categories');
            \Illuminate\Support\Facades\Cache::forget("seller_{$product->user_id}_analytics_daily_rollup_" . \Carbon\Carbon::now(config('app.timezone'))->toDateString());

            if ($product->status === 'pending_review' && ($product->wasRecentlyCreated || $product->wasChanged('status'))) {
                $admins = \App\Models\User::where('role', 'super_admin')->get();
                \Illuminate\Support\Facades\Notification::send($admins, new \App\Notifications\ProductPendingReviewNotification($product));
            } else if ($product->status === 'pending_review') {
                dd('saved observer debug:', $product->wasRecentlyCreated, $product->wasChanged('status'), $product->getOriginal('status'), $product->status);
            }
        });

        static::deleted(function ($product) {
            \Illuminate\Support\Facades\Cache::forget('shop_catalog_default_page_1');
            \Illuminate\Support\Facades\Cache::forget("seller_{$product->user_id}_products");
            \Illuminate\Support\Facades\Cache::forget("seller_{$product->user_id}_best_sellers");
            \Illuminate\Support\Facades\Cache::forget("seller_{$product->user_id}_stats");
            \Illuminate\Support\Facades\Cache::forget('catalog_materials');
            \Illuminate\Support\Facades\Cache::forget('catalog_locations');
            \Illuminate\Support\Facades\Cache::forget('catalog_categories');
            \Illuminate\Support\Facades\Cache::forget('home_sponsored_products');
            \Illuminate\Support\Facades\Cache::forget('home_featured_products_pool');
            \Illuminate\Support\Facades\Cache::forget('home_top_sellers');
            \Illuminate\Support\Facades\Cache::forget('home_categories');
            \Illuminate\Support\Facades\Cache::forget("seller_{$product->user_id}_analytics_daily_rollup_" . \Carbon\Carbon::now(config('app.timezone'))->toDateString());
        });
    }

    public function getRouteKeyName()
    {
        return 'slug';
    }

    /**
     * Scope a query to only include approved (Active) products.
     *
     * @param  \Illuminate\Database\Eloquent\Builder  $query
     * @return \Illuminate\Database\Eloquent\Builder
     */
    public function scopeApproved(\Illuminate\Database\Eloquent\Builder $query)
    {
        return $query->where('status', 'Active')
            ->whereHas('user', function ($q) {
                $q->where(function ($sub) {
                    $sub->where('last_seen_at', '>=', now()->subDays(60))
                        ->orWhereNull('last_seen_at');
                });
            });
    }
}
