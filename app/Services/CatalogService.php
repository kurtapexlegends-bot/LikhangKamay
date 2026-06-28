<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class CatalogService
{
    /**
     * Get sponsored products for the homepage.
     */
    public function getSponsoredProducts(): array
    {
        return Cache::remember('home_sponsored_products', 1800, function () {
            return Product::with('user')
                ->approved()
                ->whereHas('user', function ($q) {
                    $q->where('role', 'artisan')
                      ->where('artisan_status', 'approved')
                      ->whereHas('complianceAgreements', function ($cq) {
                          $cq->where('document_type', 'seller_terms');
                      });
                })
                ->where('is_sponsored', true)
                ->where('sponsored_until', '>', now())
                ->inRandomOrder()
                ->take(8)
                ->get()
                ->map(fn(Product $product) => $this->formatProductForHome($product, false, true))
                ->all();
        });
    }

    public function getFeaturedProducts(array $sponsoredProductIds = []): array
    {
        $pool = Cache::remember('home_featured_products_pool', 1800, function () {
            return Product::with('user')
                ->approved()
                ->whereHas('user', function ($q) {
                    $q->where('role', 'artisan')
                      ->where('artisan_status', 'approved')
                      ->whereHas('complianceAgreements', function ($cq) {
                          $cq->where('document_type', 'seller_terms');
                      });
                })
                ->orderByDesc('sold')
                ->orderByDesc('rating')
                ->orderByDesc('created_at')
                ->take(30)
                ->get()
                ->all();
        });

        $sponsoredSet = array_flip($sponsoredProductIds);
        $featured = [];

        // 1. Prioritize non-sponsored active products
        foreach ($pool as $product) {
            $isSponsored = $product->is_sponsored && $product->sponsored_until && \Carbon\Carbon::parse($product->sponsored_until)->isFuture();
            if (!isset($sponsoredSet[$product->id]) && !$isSponsored) {
                $featured[] = $this->formatProductForHome($product);
            }
            if (count($featured) >= 12) {
                break;
            }
        }

        // 2. Fallback: only if completely empty, allow sponsored products
        if (empty($featured) && !empty($sponsoredProductIds)) {
            foreach ($pool as $product) {
                if (count($featured) >= 12) {
                    break;
                }
                $formatted = $this->formatProductForHome($product);
                if (!in_array($formatted['id'], array_column($featured, 'id'))) {
                    $featured[] = $formatted;
                }
            }
        }

        return $featured;
    }

    /**
     * Get top sellers with secondary and tertiary sorting for tie-breakers.
     */
    public function getTopSellers(): array
    {
        return Cache::remember('home_top_sellers', 1800, function () {
            $topStores = Product::approved()
                ->whereHas('user', function ($q) {
                    $q->where('role', 'artisan')
                      ->where('artisan_status', 'approved')
                      ->whereHas('complianceAgreements', function ($cq) {
                          $cq->where('document_type', 'seller_terms');
                      });
                })
                ->selectRaw('user_id, SUM(sold) as total_sold')
                ->groupBy('user_id')
                ->orderByDesc('total_sold')
                ->orderByDesc(DB::raw('(SELECT COALESCE(AVG(rating), 0) FROM products p2 WHERE p2.user_id = products.user_id AND p2.status = \'Active\')'))
                ->orderBy('user_id')
                ->take(3)
                ->get();

            if ($topStores->isEmpty()) {
                return [];
            }

            $storeIds = $topStores->pluck('user_id')->all();
            $sellers = User::with(['products' => function ($q) {
                    $q->approved()
                      ->with('user')
                      ->orderByDesc('sold')
                      ->orderByDesc('rating')
                      ->orderByDesc('created_at')
                      ->take(3);
                }])
                ->whereIn('id', $storeIds)
                ->get()
                ->keyBy('id');

            $topSellers = [];
            foreach ($topStores as $rank => $store) {
                $userId = (int) $store->user_id;
                $seller = $sellers->get($userId);
                if (!$seller) continue;

                $products = $seller->products
                    ->map(fn(Product $product) => $this->formatProductForHome($product, true))
                    ->values();

                $topSellers[] = [
                    'rank' => $rank + 1,
                    'store_name' => $seller->shop_name ?? $seller->name,
                    'store_slug' => $seller->shop_slug,
                    'store_avatar' => $seller->avatar,
                    'premium_tier' => $seller->premium_tier,
                    'total_sold' => (int) $store->total_sold,
                    'products' => $products->all(),
                ];
            }

            return $topSellers;
        });
    }

    /**
     * Get list of active categories.
     */
    public function getCategories(): array
    {
        return Cache::remember('home_categories', 86400, function () {
            return Category::orderBy('name')->pluck('name')->toArray();
        });
    }

    /**
     * Build catalog query with filters and sorting.
     */
    public function buildCatalogQuery(array $filters)
    {
        $query = Product::approved()
            ->whereHas('user', function ($q) {
                $q->where('role', 'artisan')
                  ->where('artisan_status', 'approved')
                  ->whereHas('complianceAgreements', function ($cq) {
                      $cq->where('document_type', 'seller_terms');
                  });
            })
            ->with(['user']);

        if (!empty($filters['category']) && $filters['category'] !== 'All') {
            $query->where('category', $filters['category']);
        }

        if (!empty($filters['search'])) {
            $search = trim((string) $filters['search']);
            $query->search($search, ['name', 'description', 'category']);
            $query->orWhereHas('user', function ($q) use ($search) {
                $q->where('role', 'artisan')->search($search, ['shop_name', 'name']);
            });
        }

        if (isset($filters['price_min']) && $filters['price_min'] !== '') {
            $query->where('price', '>=', $filters['price_min']);
        }
        if (isset($filters['price_max']) && $filters['price_max'] !== '') {
            $query->where('price', '<=', $filters['price_max']);
        }

        if (!empty($filters['locations'])) {
            $locations = is_array($filters['locations']) ? $filters['locations'] : explode(',', $filters['locations']);
            $query->whereHas('user', fn ($q) => $q->whereIn('city', $locations));
        }

        if (!empty($filters['materials'])) {
            $materials = is_array($filters['materials']) ? $filters['materials'] : explode(',', $filters['materials']);
            $query->whereIn('clay_type', $materials);
        }

        if (isset($filters['min_rating']) && $filters['min_rating'] !== '') {
            $query->where('rating', '>=', (float) $filters['min_rating']);
        }

        $this->applyCatalogSorting($query, $filters['sort'] ?? null);

        return $query;
    }

    /**
     * Apply multi-layered tie-breaker sorting configurations.
     */
    private function applyCatalogSorting(\Illuminate\Database\Eloquent\Builder $query, ?string $sort)
    {
        switch ($sort) {
            case 'price_low':
                $query->orderBy('price', 'asc')
                      ->orderByDesc('sold')
                      ->orderByDesc('rating')
                      ->orderByDesc('created_at');
                break;
            case 'price_high':
                $query->orderBy('price', 'desc')
                      ->orderByDesc('sold')
                      ->orderByDesc('rating')
                      ->orderByDesc('created_at');
                break;
            case 'popular':
                $query->orderByDesc('sold')
                      ->orderByDesc('rating')
                      ->orderByDesc('created_at');
                break;
            case 'rating':
                $query->orderByDesc('rating')
                      ->orderByDesc('sold')
                      ->orderByDesc('created_at');
                break;
            case 'newest':
            default:
                $query->orderByDesc('created_at')
                      ->orderByDesc('sold')
                      ->orderByDesc('rating');
                break;
        }
    }

    /**
     * Format a product mapping specifically for landing layout components.
     */
    public function formatProductForHome(Product $product, bool $shortMode = false, bool $isSponsored = false): array
    {
        $data = [
            'id' => $product->id,
            'name' => $product->name,
            'price' => $product->price,
            'sold' => $product->sold ?? 0,
            'rating' => (float) ($product->rating ?? 0),
            'img' => $product->img,
            'slug' => $product->slug,
            'seller_slug' => $product->user->shop_slug ?? null,
            'seller_name' => $product->user->shop_name ?? $product->user->name ?? 'LikhangKamay Artisan',
        ];

        if (!$shortMode) {
            $data['location'] = $product->user->city ?? 'Philippines';
            $data['category'] = $product->category;
        }

        if ($isSponsored) {
            $data['is_sponsored'] = true;
        }

        return $data;
    }

    /**
     * Get metadata options for filtering selection inputs.
     */
    public function getCatalogMetadata(): array
    {
        $locations = Cache::remember('catalog_locations', 3600, function () {
            return User::whereHas('products', fn ($q) => $q->approved())
                ->whereNotNull('city')
                ->distinct()
                ->pluck('city')
                ->filter()
                ->values()
                ->toArray();
        });

        $materials = Cache::remember('catalog_materials', 3600, function () {
            return Product::approved()
                ->whereNotNull('clay_type')
                ->distinct()
                ->pluck('clay_type')
                ->filter()
                ->values()
                ->toArray();
        });

        $categories = Cache::remember('catalog_categories', 86400, function () {
            return ['All', ...Category::orderBy('name')->pluck('name')->toArray()];
        });

        return [
            'locations' => $locations,
            'materials' => $materials,
            'categories' => $categories,
        ];
    }

    /**
     * Format the catalog search item details.
     */
    public function serializeCatalogProduct(Product $product): array
    {
        return [
            'id' => $product->id,
            'slug' => $product->slug,
            'name' => $product->name,
            'price' => number_format($product->price, 2),
            'raw_price' => $product->price,
            'category' => $product->category,
            'rating' => (float) ($product->rating ?? 0),
            'reviews_count' => $product->reviews_count ?? 0,
            'sold' => $product->sold ?? 0,
            'image' => $product->img,
            'seller' => $product->user->shop_name ?? $product->user->name ?? 'LikhangKamay Artisan',
            'seller_slug' => $product->user->shop_slug,
            'location' => $product->user->city ?? 'Philippines',
            'clay_type' => $product->clay_type,
            'is_new' => $product->created_at ? $product->created_at->diffInDays(now()) < 7 : false,
            'is_sponsored' => $product->is_sponsored && $product->sponsored_until && \Carbon\Carbon::parse($product->sponsored_until)->isFuture(),
        ];
    }
}
