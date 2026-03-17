<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\User;
use App\Http\Controllers\ProductController;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ShopController extends Controller
{
    public function index(Request $request)
    {
        // 1. Base Query - Include aggregates for rating and count
        $query = Product::where('status', 'Active')
            ->with(['user'])
            ->withAvg('reviews', 'rating')
            ->withCount('reviews');

        // 2. Filters

        // Category Filter
        if ($request->filled('category') && $request->category !== 'All') {
            $query->where('category', $request->category);
        }

        // Search Filter (Weighted)
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    // If product is sponsored and has valid dates, it should match the "sponsored" keyword
                    ->orWhere(function($sq) use ($search) {
                        if (strtolower($search) === 'sponsored') {
                            $sq->where('is_sponsored', true)
                               ->where('sponsored_until', '>=', now());
                        }
                    });
            });

            // Weighted Ordering: Sponsored > Name match > Category match > Description match
            $query->orderByRaw("
                CASE 
                    WHEN is_sponsored = 1 AND sponsored_until >= NOW() THEN 1
                    WHEN name LIKE ? THEN 2
                    WHEN category LIKE ? THEN 3
                    ELSE 4 
                END
            ", ["%{$search}%", "%{$search}%"]);
        }

        // Price Range Filter
        if ($request->filled('price_min')) {
            $query->where('price', '>=', $request->price_min);
        }
        if ($request->filled('price_max')) {
            $query->where('price', '<=', $request->price_max);
        }

        // Location/City Filter (based on seller's city)
        if ($request->filled('locations')) {
            $locations = explode(',', $request->locations);
            $query->whereHas('user', function ($q) use ($locations) {
                $q->whereIn('city', $locations);
            });
        }

        // Clay Type / Material Filter
        if ($request->filled('materials')) {
            $materials = explode(',', $request->materials);
            $query->whereIn('clay_type', $materials);
        }

        // Rating Filter (minimum rating)
        if ($request->filled('min_rating')) {
            $minRating = (float) $request->min_rating;
            $query->where(function ($q) use ($minRating) {
                // Products with avg rating >= min
                $q->whereRaw('(SELECT AVG(rating) FROM reviews WHERE reviews.product_id = products.id) >= ?', [$minRating]);
            });
        }

        // 3. Sorting
        switch ($request->sort) {
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
                // Sort by average rating (products with reviews first)
                $query->orderByDesc('reviews_avg_rating');
                break;
            case 'newest':
            default:
                $query->latest();
                break;
        }

        // 4. Get available filter options for sidebar
        $availableLocations = User::whereHas('products', function ($q) {
            $q->where('status', 'Active');
        })->whereNotNull('city')
            ->distinct()
            ->pluck('city')
            ->filter()
            ->values();

        $availableMaterials = Product::where('status', 'Active')
            ->whereNotNull('clay_type')
            ->distinct()
            ->pluck('clay_type')
            ->filter()
            ->values();

        // 5. Fetch Products
        $products = $query->get()->map(function ($product) {
            return [
                'id' => $product->id,
                'slug' => $product->slug,
                'name' => $product->name,
                'price' => number_format($product->price, 2),
                'raw_price' => $product->price,
                'category' => $product->category,
                'rating' => $product->reviews_avg_rating ?? 0,
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
        });

        // 5b. Separate Sponsored Products for highlighting (if search is active)
        $sponsoredResults = $products->filter(function($p) {
            return $p['is_sponsored'];
        })->values();

        // 6. Categories list
        $categories = ['All', ...ProductController::VALID_CATEGORIES];

        return Inertia::render('Shop/Catalog', [
            'products' => $products,
            'sponsoredProducts' => $sponsoredResults,
            'categories' => $categories,
            'availableLocations' => $availableLocations,
            'availableMaterials' => $availableMaterials,
            'filters' => $request->only([
                'search',
                'category',
                'price_min',
                'price_max',
                'sort',
                'locations',
                'materials',
                'min_rating'
            ])
        ]);
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

        $products = Product::where('user_id', $seller->id)
            ->where('status', 'Active')
            ->latest()
            ->get()
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'slug' => $product->slug,
                    'name' => $product->name,
                    'price' => number_format($product->price, 2),
                    'category' => $product->category,
                    'rating' => $product->rating ?? 0,
                    'sold' => $product->sold ?? 0,
                    'image' => $product->img,
                    'is_new' => $product->created_at->diffInDays(now()) < 7,
                ];
            });

        // DSS: Store-Specific Best Sellers (top 5)
        $bestSellers = Product::where('user_id', $seller->id)
            ->where('status', 'Active')
            ->where('sold', '>', 0)
            ->orderByDesc('sold')
            ->take(5)
            ->get()
            ->map(function ($product) {
                return [
                    'id' => $product->id,
                    'slug' => $product->slug,
                    'name' => $product->name,
                    'price' => number_format($product->price, 2),
                    'rating' => $product->rating ?? 0,
                    'sold' => $product->sold ?? 0,
                    'image' => $product->img,
                ];
            });

        // Calculate Stats
        $totalSales = $products->sum('sold');
        $avgRating = \App\Models\Review::whereHas('product', function ($q) use ($seller) {
            $q->where('user_id', $seller->id);
        })->avg('rating') ?? 0;

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
            'stats' => [
                'products' => $products->count(),
                'sales' => $totalSales,
                'rating' => number_format($avgRating, 1),
            ]
        ]);
    }

    public function settings(Request $request)
    {
        $user = $request->user()->load(['products' => fn($q) => $q->where('status', 'Active')]);

        $totalSales = $user->products->sum('sold');
        $avgRating  = \App\Models\Review::whereHas('product', fn($q) => $q->where('user_id', $user->id))
            ->avg('rating') ?? 0;

        return Inertia::render('Seller/ShopSettings', [
            'user'  => $user,
            'stats' => [
                'products' => $user->products->count(),
                'sales'    => $totalSales,
                'rating'   => number_format($avgRating, 1),
            ],
        ]);
    }

    public function updateSettings(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'bio' => 'nullable|string|max:500',
            'banner_image' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
            'avatar' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:5120',
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

        return redirect()->back()->with('success', 'Shop settings updated successfully.');
    }
}
