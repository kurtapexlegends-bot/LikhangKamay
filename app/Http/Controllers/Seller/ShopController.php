<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;

use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
use Inertia\Inertia;

class ShopController extends Controller
{
    // Public marketplace catalog methods have been moved to App\Services\CatalogService and App\Http\Controllers\Consumer\CatalogController.


    /**
     * Display a seller's shop profile.
     *
     * @param  \App\Models\User  $user
     * @return \Inertia\Response
     */
    public function seller(User $user)
    {
        $seller = $user;

        $hasAccepted = \App\Models\SellerComplianceAgreement::where('user_id', $seller->id)
            ->where('document_type', 'seller_terms')
            ->exists();

        if ($seller->role !== 'artisan' || $seller->artisan_status !== 'approved' || !$hasAccepted) {
            abort(404);
        }

        $products = Cache::remember("seller_{$seller->id}_products", 1800, function() use ($seller) {
            return Product::query()
                ->where('user_id', $seller->id)
                ->where('status', 'Active')
                ->latest()
                ->get()
                ->map(function ($product) {
                    return [
                        'id' => $product->id,
                        'slug' => $product->slug,
                        'name' => $product->name,
                        'price' => number_format((float) $product->price, 2),
                        'category' => $product->category,
                        'rating' => $product->rating ? round($product->rating, 1) : 0,
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
                ->orderByDesc('sold')
                ->take(5)
                ->get()
                ->map(function ($product) {
                    return [
                        'id' => $product->id,
                        'slug' => $product->slug,
                        'name' => $product->name,
                        'price' => number_format((float) $product->price, 2),
                        'rating' => $product->rating ? round($product->rating, 1) : 0,
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

        return Inertia::render('Consumer/Shop/SellerProfile', [
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

        return Inertia::render('Seller/Settings/ShopSettings', [
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
