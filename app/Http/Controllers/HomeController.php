<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

class HomeController extends Controller
{
    public function index()
    {
        $sponsoredProducts = $this->getSponsoredProducts();

        return Inertia::render('Welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'featuredProducts' => $this->getFeaturedProducts(collect($sponsoredProducts)->pluck('id')->all()),
            'sponsoredProducts' => $sponsoredProducts,
            'topSellers' => $this->getTopSellers(),
            'categories' => ProductController::VALID_CATEGORIES,
        ]);
    }

    private function getTopSellers(): array
    {
        $topStores = Product::where('status', 'Active')
            ->selectRaw('user_id, SUM(sold) as total_sold')
            ->groupBy('user_id')
            ->orderByDesc('total_sold')
            ->take(3)
            ->get();

        if ($topStores->isEmpty()) {
            return [];
        }

        $storeIds = $topStores->pluck('user_id')->all();
        $sellers = \App\Models\User::whereIn('id', $storeIds)
            ->get()
            ->keyBy('id');
        $productsBySeller = Product::with('user')
            ->whereIn('user_id', $storeIds)
            ->where('status', 'Active')
            ->orderByDesc('sold')
            ->get()
            ->groupBy('user_id');

        $topSellers = [];
        foreach ($topStores as $rank => $store) {
            $userId = (int) $store->user_id;
            $seller = $sellers->get($userId);
            if (!$seller) continue;

            $products = ($productsBySeller->get($userId) ?? collect())
                ->take(3)
                ->map(fn($product) => $this->formatProductForHome($product, true))
                ->values();

            $topSellers[] = [
                'rank' => $rank + 1,
                'store_name' => $seller->shop_name ?? $seller->name,
                'store_slug' => $seller->shop_slug,
                'store_avatar' => $seller->avatar,
                'premium_tier' => $seller->premium_tier,
                'total_sold' => (int) $store->total_sold,
                'products' => $products,
            ];
        }

        return $topSellers;
    }

    private function getFeaturedProducts(array $sponsoredProductIds = []): array
    {
        $featuredProducts = Product::with('user')
            ->where('status', 'Active')
            ->when(!empty($sponsoredProductIds), function ($query) use ($sponsoredProductIds) {
                $query->whereNotIn('id', $sponsoredProductIds);
            })
            ->where(function ($query) {
                $query->where('is_sponsored', false)
                    ->orWhereNull('sponsored_until')
                    ->orWhere('sponsored_until', '<=', now());
            })
            ->orderByDesc('sold')
            ->take(12)
            ->get();

        if ($featuredProducts->count() < 12) {
            $fallbackExcludeIds = array_values(array_unique([
                ...$sponsoredProductIds,
                ...$featuredProducts->pluck('id')->all(),
            ]));

            $fallbackProducts = Product::with('user')
                ->where('status', 'Active')
                ->when(!empty($fallbackExcludeIds), function ($query) use ($fallbackExcludeIds) {
                    $query->whereNotIn('id', $fallbackExcludeIds);
                })
                ->orderByDesc('sold')
                ->take(12 - $featuredProducts->count())
                ->get();

            $featuredProducts = $featuredProducts->concat($fallbackProducts);
        }

        if ($featuredProducts->isEmpty() && !empty($sponsoredProductIds)) {
            $featuredProducts = Product::with('user')
                ->where('status', 'Active')
                ->whereIn('id', $sponsoredProductIds)
                ->orderByDesc('sold')
                ->take(12)
                ->get();
        }

        return $featuredProducts
            ->unique('id')
            ->values()
            ->map(fn($product) => $this->formatProductForHome($product))
            ->all();
    }

    private function getSponsoredProducts(): array
    {
        return Product::with('user')
            ->where('status', 'Active')
            ->where('is_sponsored', true)
            ->where('sponsored_until', '>', now())
            ->inRandomOrder()
            ->take(8)
            ->get()
            ->map(fn($product) => $this->formatProductForHome($product, false, true))
            ->all();
    }

    private function formatProductForHome($product, bool $shortMode = false, bool $isSponsored = false): array
    {
        $data = [
            'id' => $product->id,
            'name' => $product->name,
            'price' => $product->price,
            'sold' => $product->sold ?? 0,
            'rating' => $product->rating ?? 0,
            'img' => $product->img,
            'slug' => $product->slug,
            'seller_slug' => $product->user->shop_slug,
            'seller_name' => $product->user->shop_name ?? $product->user->name,
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
}
