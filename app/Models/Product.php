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

    public function resubmissions()
    {
        return $this->hasMany(ProductResubmission::class);
    }

    public function latestResubmission()
    {
        return $this->hasOne(ProductResubmission::class)->latestOfMany();
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
        return $this->hasOne(Supply::class);
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
                    if (
                        $product->status !== 'Draft' && 
                        $product->status !== 'Archived' &&
                        $product->status !== 'rejected' &&
                        $product->status !== 'flagged'
                    ) {
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

    public function getRouteKey()
    {
        return \App\Support\RouteObfuscator::encode($this->id);
    }

    public function resolveRouteBinding($value, $field = null)
    {
        $decodedId = \App\Support\RouteObfuscator::decode($value);
        if ($decodedId) {
            return $this->where('id', $decodedId)->firstOrFail();
        }

        return $this->where($field ?? 'slug', $value)
            ->orWhere('id', $value)
            ->firstOrFail();
    }

    public function getSlugAttribute($value)
    {
        return $this->id ? \App\Support\RouteObfuscator::encode($this->id) : $value;
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

    public function evaluateActivationReadiness(): array
    {
        $missing = [];

        if (!$this->cover_photo_path) {
            $missing[] = 'a cover image';
        }

        $galleryCount = count($this->gallery_paths ?? []);
        if ($galleryCount < 3 || $galleryCount > 5) {
            $missing[] = '3 to 5 gallery images';
        }

        if (!$this->model_3d_path) {
            $missing[] = 'a 3D model';
        }

        return [
            'canBeActive' => empty($missing),
            'missing' => $missing,
        ];
    }

    public function getRelatedProducts(): \Illuminate\Support\Collection
    {
        $preferredMatches = self::query()
            ->where('status', 'Active')
            ->where('id', '!=', $this->id)
            ->where('category', $this->category)
            ->with('user')
            ->orderByRaw("
                CASE
                    WHEN user_id = ? THEN 1
                    WHEN clay_type IS NOT NULL AND clay_type = ? THEN 2
                    WHEN glaze_type IS NOT NULL AND glaze_type = ? THEN 3
                    WHEN firing_method IS NOT NULL AND firing_method = ? THEN 4
                    ELSE 5
                END
            ", [
                $this->user_id,
                $this->clay_type,
                $this->glaze_type,
                $this->firing_method,
            ])
            ->orderByDesc('sold')
            ->orderByDesc('rating')
            ->orderByDesc('reviews_count')
            ->latest()
            ->take(4)
            ->get();

        $fallbackProducts = collect();

        if ($preferredMatches->count() < 4) {
            $fallbackProducts = self::query()
                ->where('status', 'Active')
                ->where('id', '!=', $this->id)
                ->whereNotIn('id', $preferredMatches->pluck('id'))
                ->with('user')
                ->orderByRaw("
                    CASE
                        WHEN category = ? THEN 1
                        WHEN user_id = ? THEN 2
                        ELSE 3
                    END
                ", [$this->category, $this->user_id])
                ->orderByDesc('sold')
                ->orderByDesc('rating')
                ->orderByDesc('reviews_count')
                ->latest()
                ->take(4 - $preferredMatches->count())
                ->get();
        }

        return $preferredMatches
            ->concat($fallbackProducts)
            ->take(4)
            ->map(function (Product $relatedProduct) {
                return [
                    'id' => $relatedProduct->id,
                    'name' => $relatedProduct->name,
                    'slug' => $relatedProduct->slug,
                    'price' => $relatedProduct->price,
                    'image' => $relatedProduct->img,
                    'rating' => (float) ($relatedProduct->rating ?? 0),
                    'sold' => $relatedProduct->sold,
                    'location' => $relatedProduct->user->city ?? 'PH',
                ];
            })
            ->values();
    }
}

