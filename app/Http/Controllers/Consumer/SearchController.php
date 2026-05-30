<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;

use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Provide instant search results for products and artisans.
     */
    public function suggestions(Request $request)
    {
        $search = $request->query('q');

        if (empty($search) || strlen($search) < 2) {
            return response()->json([
                'products' => [],
                'artisans' => []
            ]);
        }

        $products = Product::where('status', 'Active')
            ->search($search, ['name', 'category'])
            ->with('user:id,shop_name,name,shop_slug,avatar')
            ->limit(5)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'slug' => $p->slug,
                'price' => number_format($p->price, 2),
                'image' => $p->img,
                'seller' => $p->user->shop_name ?? $p->user->name,
            ]);

        $artisans = User::where('role', 'artisan')
            ->where('artisan_status', 'approved')
            ->search($search, ['name', 'shop_name', 'bio'])
            ->limit(3)
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->shop_name ?? $u->name,
                'slug' => $u->shop_slug,
                'avatar' => $u->avatar,
                'location' => $u->city,
            ]);

        return response()->json([
            'products' => $products,
            'artisans' => $artisans
        ]);
    }
}
