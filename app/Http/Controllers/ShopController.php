<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\User;
use App\Http\Controllers\ProductController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ShopController extends Controller
{
    public function index(Request $request)
    {
        try {
            $query = $this->buildCatalogQuery($request);
            $paginator = $query->paginate(20)->withQueryString();
            
            $paginator->through(fn ($product) => $this->serializeCatalogProduct($product));

            $sponsoredResults = collect($paginator->items())
                ->filter(fn($p) => $p['is_sponsored'])
                ->values();

            $metadata = $this->getCatalogMetadata();

        } catch (\Exception $e) {
            $paginator = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 20);
            $sponsoredResults = [];
            $metadata = [
                'categories' => ['All'],
                'locations' => [],
                'materials' => [],
            ];
            
            if (config('app.debug')) {
                report($e);
            }
        }

        return Inertia::render('Shop/Catalog', [
            'products' => $paginator,
            'sponsoredProducts' => $sponsoredResults,
            'categories' => $metadata['categories'],
            'availableLocations' => $metadata['locations'],
            'availableMaterials' => $metadata['materials'],
            'filters' => $request->only([
                'search', 'category', 'price_min', 'price_max', 'sort', 'locations', 'materials', 'min_rating'
            ])
        ]);
    }

    private function buildCatalogQuery(Request $request)
    {
        $query = Product::where('status', 'Active')
            ->with(['user'])
            ->withAvg('publicReviews as reviews_avg_rating', 'rating')
            ->withCount('publicReviews as reviews_count');

        if ($request->filled('category') && $request->category !== 'All') {
            $query->where('category', $request->category);
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->search);
            $query->search($search, ['name', 'description', 'category']);
            $query->orWhereHas('user', function ($q) use ($search) {
                $q->where('role', 'artisan')->search($search, ['shop_name', 'name']);
            });
        }

        if ($request->filled('price_min')) {
            $query->where('price', '>=', $request->price_min);
        }
        if ($request->filled('price_max')) {
            $query->where('price', '<=', $request->price_max);
        }

        if ($request->filled('locations')) {
            $locations = explode(',', $request->locations);
            $query->whereHas('user', fn ($q) => $q->whereIn('city', $locations));
        }

        if ($request->filled('materials')) {
            $materials = explode(',', $request->materials);
            $query->whereIn('clay_type', $materials);
        }

        if ($request->filled('min_rating')) {
            $query->having('reviews_avg_rating', '>=', (float) $request->min_rating);
        }

        $this->applyCatalogSorting($query, $request->sort);

        return $query;
    }

    private function applyCatalogSorting(\Illuminate\Database\Eloquent\Builder $query, ?string $sort)
    {
        switch ($sort) {
            case 'price_low':
                $query->orderBy('price', 'asc');
                break;
            case 'price_high':
                $query->orderBy('price', 'desc');
                break;
            case 'popular':
                $query->orderBy('sold', 'desc');
                break;
            case 'rating':
                $query->orderByDesc('reviews_avg_rating');
                break;
            case 'newest':
            default:
                $query->latest();
                break;
        }
    }

    private function getCatalogMetadata(): array
    {
        $locations = Cache::remember('catalog_locations', 3600, function () {
            return User::whereHas('products', fn ($q) => $q->where('status', 'Active'))
                ->whereNotNull('city')
                ->distinct()
                ->pluck('city')
                ->filter()
                ->values();
        });

        $materials = Cache::remember('catalog_materials', 3600, function () {
            return Product::where('status', 'Active')
                ->whereNotNull('clay_type')
                ->distinct()
                ->pluck('clay_type')
                ->filter()
                ->values();
        });

        $categories = Cache::remember('catalog_categories', 86400, function () {
            return ['All', ...\App\Models\Category::orderBy('name')->pluck('name')->toArray()];
        });

        return [
            'locations' => $locations,
            'materials' => $materials,
            'categories' => $categories,
        ];
    }

    private function serializeCatalogProduct(Product $product): array
    {
        return [
            'id' => $product->id,
            'slug' => $product->slug,
            'name' => $product->name,
            'price' => number_format($product->price, 2),
            'raw_price' => $product->price,
            'category' => $product->category,
            'rating' => (float) ($product->reviews_avg_rating ?? 0),
            'reviews_count' => $product->reviews_count ?? 0,
            'sold' => $product->sold ?? 0,
            'image' => $product->img,
            'seller' => $product->user->shop_name ?? $product->user->name ?? 'LikhangKamay Artisan',
            'seller_slug' => $product->user->shop_slug,
            'location' => $product->user->city ?? 'Philippines',
            'clay_type' => $product->clay_type,
            'is_new' => $product->created_at->diffInDays(now()) < 7,
            'is_sponsored' => $product->is_sponsored && $product->sponsored_until && \Carbon\Carbon::parse($product->sponsored_until)->isFuture(),
        ];
    }

    /**
     * Display a seller's shop profile.
     *
     * @param  \App\Models\User  $user
     * @return \Inertia\Response
     */
    public function seller(User $user)
    {
        $seller = $user;

        if ($seller->role !== 'artisan' || $seller->artisan_status !== 'approved') {
            abort(404);
        }

        $products = Cache::remember("seller_{$seller->id}_products", 1800, function() use ($seller) {
            return Product::query()
                ->where('user_id', $seller->id)
                ->where('status', 'Active')
                ->withAvg('publicReviews as computed_rating', 'rating')
                ->latest()
                ->get()
                ->map(function ($product) {
                    return [
                        'id' => $product->id,
                        'slug' => $product->slug,
                        'name' => $product->name,
                        'price' => number_format((float) $product->price, 2),
                        'category' => $product->category,
                        'rating' => $product->computed_rating ? round($product->computed_rating, 1) : 0,
                        'sold' => $product->sold ?? 0,
                        'image' => $product->img,
                        'is_new' => $product->created_at ? $product->created_at->diffInDays(now()) < 7 : false,
                    ];
                });
        });

        // DSS: Store-Specific Best Sellers (top 5)
        $bestSellers = Cache::remember("seller_{$seller->id}_best_sellers", 1800, function() use ($seller) {
            return Product::query()
                ->where('user_id', $seller->id)
                ->where('status', 'Active')
                ->where('sold', '>', 0)
                ->withAvg('publicReviews as computed_rating', 'rating')
                ->orderByDesc('sold')
                ->take(5)
                ->get()
                ->map(function ($product) {
                    return [
                        'id' => $product->id,
                        'slug' => $product->slug,
                        'name' => $product->name,
                        'price' => number_format((float) $product->price, 2),
                        'rating' => $product->computed_rating ? round($product->computed_rating, 1) : 0,
                        'sold' => $product->sold ?? 0,
                        'image' => $product->img,
                    ];
                });
        });

        // Calculate Stats
        $stats = Cache::remember("seller_{$seller->id}_stats", 1800, function() use ($seller, $products) {
            $totalSales = $products->sum('sold');
            $avgRating = \App\Models\Review::whereHas('product', function ($q) use ($seller) {
                $q->where('user_id', $seller->id);
            })->visibleToMarketplace()->avg('rating') ?? 0;

            return [
                'products' => $products->count(),
                'sales' => $totalSales,
                'rating' => number_format($avgRating, 1),
            ];
        });

        return Inertia::render('Shop/SellerProfile', [
            'seller' => [
                'id' => $seller->id,
                'slug' => $seller->shop_slug,
                'name' => $seller->shop_name ?? $seller->name,
                'avatar' => $seller->avatar,
                'banner_image' => $seller->banner_image,
                'location' => $seller->city ?? 'Philippines',
                'joined_at' => $seller->created_at->format('F Y'),
                'bio' => $seller->bio ?? "Passionate artisan creating unique handcrafted items.",
                'premium_tier' => $seller->premium_tier,
            ],
            'products' => $products,
            'bestSellers' => $bestSellers,
            'stats' => $stats
        ]);
    }

    public function settings(Request $request)
    {
        $user = $request->user()->getEffectiveSeller();
        abort_unless($user && $user->isArtisan(), 403, 'Seller workspace access only.');

        $user->loadCount(['products' => fn($q) => $q->where('status', 'Active')]);
        $user->loadSum(['products as total_sales' => fn($q) => $q->where('status', 'Active')], 'sold');

        $avgRating  = \App\Models\Review::whereHas('product', fn($q) => $q->where('user_id', $user->id))
            ->visibleToMarketplace()
            ->avg('rating') ?? 0;

        return Inertia::render('Seller/ShopSettings', [
            'user'  => $user,
            'stats' => [
                'products' => $user->products_count ?? 0,
                'sales'    => $user->total_sales ?? 0,
                'rating'   => number_format($avgRating, 1),
            ],
        ]);
    }

    public function updateSettings(Request $request)
    {
        $user = $request->user()->getEffectiveSeller();
        abort_unless($user && $user->isArtisan(), 403, 'Seller workspace access only.');

        $before = [
            'bio' => (string) ($user->bio ?? ''),
            'has_banner' => filled($user->banner_image),
            'has_avatar' => filled($user->avatar),
        ];

        $validated = $request->validate([
            'bio' => 'nullable|string|max:500',
            'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:10240',
        ]);

        $user->bio = $validated['bio'] ?? null;

        if ($request->hasFile('banner_image')) {
            if ($user->banner_image) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->banner_image);
            }
            $bannerPath = $request->file('banner_image')->store('shop_banners', 'public');
            $user->banner_image = $bannerPath;
        }

        if ($request->hasFile('avatar')) {
            if ($user->avatar) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar);
            }
            $avatarPath = $request->file('avatar')->store('avatars', 'public');
            $user->avatar = $avatarPath;
        }

        $user->save();

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $user->id,
            'actor_user_id' => $request->user()?->id,
            'actor_type' => SellerActivityLog::resolveActorType($request->user(), 'owner'),
            'category' => 'operations',
            'module' => 'shop_settings',
            'event_type' => 'settings_updated',
            'severity' => 'info',
            'status' => 'updated',
            'title' => 'Shop Settings Updated',
            'summary' => 'Seller workspace profile details were updated.',
            'subject_type' => User::class,
            'subject_id' => $user->id,
            'subject_label' => $user->shop_name ?: $user->name,
            'details' => [
                'before' => $before,
                'after' => [
                    'bio' => (string) ($user->bio ?? ''),
                    'has_banner' => filled($user->banner_image),
                    'has_avatar' => filled($user->avatar),
                ],
                'lines' => array_values(array_filter([
                    $request->hasFile('banner_image') ? 'Updated shop banner image' : null,
                    $request->hasFile('avatar') ? 'Updated shop avatar image' : null,
                    array_key_exists('bio', $validated) ? 'Updated shop bio' : null,
                ])),
            ],
            'target_url' => route('shop.settings'),
            'target_label' => 'Open Shop Settings',
        ]);

        return redirect()->back()->with('success', 'Shop settings updated successfully.');
    }
}
