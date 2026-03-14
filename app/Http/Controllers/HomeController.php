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
        return Inertia::render('Welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'featuredProducts' => $this->getFeaturedProducts(),
            'sponsoredProducts' => $this->getSponsoredProducts(),
            'topSellers' => $this->getTopSellers(),
            'categories' => ProductController::VALID_CATEGORIES,
        ]);
    }

    private function getTopSellers(): array
    {
        $topStoreIds = Product::where('status', 'Active')
            ->selectRaw('user_id, SUM(sold) as total_sold')
            ->groupBy('user_id')
            ->orderByDesc('total_sold')
            ->take(3)
            ->pluck('user_id')
            ->toArray();

        $topSellers = [];
        foreach ($topStoreIds as $rank => $userId) {
            $seller = \App\Models\User::find($userId);
            if (!$seller) continue;
            
            $products = Product::with('user')
                ->where('user_id', $userId)
                ->where('status', 'Active')
                ->orderByDesc('sold')
                ->take(3)
                ->get()
                ->map(fn($product) => $this->formatProductForHome($product, true));

            $topSellers[] = [
                'rank' => $rank + 1,
                'store_name' => $seller->shop_name ?? $seller->name,
                'store_slug' => $seller->shop_slug,
                'store_avatar' => $seller->avatar,
                'premium_tier' => $seller->premium_tier,
                'total_sold' => Product::where('user_id', $userId)->sum('sold'),
                'products' => $products,
            ];
        }

        return $topSellers;
    }

    private function getFeaturedProducts()
    {
        return Product::with('user')
            ->where('status', 'Active')
            ->orderBy('sold', 'desc')
            ->take(12)
            ->get()
            ->map(fn($product) => $this->formatProductForHome($product));
    }

    private function getSponsoredProducts()
    {
        return Product::with('user')
            ->where('status', 'Active')
            ->where('is_sponsored', true)
            ->where('sponsored_until', '>', now())
            ->inRandomOrder()
            ->take(8)
            ->get()
            ->map(fn($product) => $this->formatProductForHome($product, false, true));
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
