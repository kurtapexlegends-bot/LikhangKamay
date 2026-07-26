<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use App\Services\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class SearchController extends Controller
{
    /**
     * Provide instant, lightweight search suggestions for products and artisans.
     */
    public function suggestions(Request $request)
    {
        $search = trim((string) $request->query('q'));

        if (strlen($search) < 2) {
            return response()->json([
                'products' => [],
                'artisans' => [],
            ])->header('Cache-Control', 'public, max-age=30');
        }

        $searchLower = strtolower($search);

        // Fetch top 4 lightweight product matches
        $products = Product::approved()
            ->search($search, ['name', 'category'])
            ->with(['user:id,shop_name,name,shop_slug'])
            ->select(['id', 'name', 'slug', 'price', 'cover_photo_path', 'user_id'])
            ->limit(4)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'price' => number_format((float) $p->price, 2),
                'image' => StorageUrl::url($p->cover_photo_path, '/images/no-image.png'),
                'seller' => $p->user?->shop_name ?? $p->user?->name ?? 'Artisan',
            ]);

        // Cache lightweight approved artisans search list
        $artisansList = Cache::remember('approved_artisans_search_list', 3600, function () {
            return User::where('role', 'artisan')
                ->where('artisan_status', 'approved')
                ->whereNull('banned_at')
                ->select(['id', 'name', 'shop_name', 'shop_slug', 'avatar', 'city', 'bio', 'premium_tier'])
                ->get()
                ->map(fn($u) => [
                    'id' => $u->id,
                    'name' => $u->shop_name ?: $u->name,
                    'slug' => $u->shop_slug ?: $u->id,
                    'avatar' => $u->avatar ? StorageUrl::url($u->avatar) : null,
                    'location' => $u->city ?: 'Philippines',
                    'plan' => $u->premium_tier ?? 'free',
                    'searchable' => strtolower(($u->shop_name ?? '') . ' ' . ($u->name ?? '') . ' ' . ($u->bio ?? '')),
                ])
                ->all();
        });

        $artisans = collect($artisansList)
            ->filter(fn($u) => str_contains($u['searchable'], $searchLower))
            ->take(3)
            ->map(fn($u) => [
                'id' => $u['id'],
                'name' => $u['name'],
                'slug' => $u['slug'],
                'avatar' => $u['avatar'],
                'location' => $u['location'],
                'plan' => $u['plan'],
            ])
            ->values();

        return response()->json([
            'products' => $products,
            'artisans' => $artisans,
        ])->header('Cache-Control', 'public, max-age=15');
    }
}
