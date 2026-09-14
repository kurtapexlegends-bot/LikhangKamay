<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;

use App\Events\ShopSettingsUpdated;
use App\Http\Requests\Seller\UpdateShopSettingsRequest;
use App\Models\Product;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Storage;
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

        if ($seller->role !== 'artisan' || $seller->artisan_status !== 'approved' || !$hasAccepted || $seller->banned_at !== null || $seller->isSuspended()) {
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
                'avatar_url' => $seller->avatar_url,
                'banner_image' => $seller->banner_image,
                'banner_image_url' => $seller->banner_image_url,
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
        $user = $request->user()?->getEffectiveSeller();
        abort_unless($user && $user->isArtisan(), 403, 'Seller workspace access only.');

        $user->load(['products' => fn($q) => $q->where('status', 'Active')->latest()->take(12)]);

        $productsCount = (int) Product::where('user_id', $user->id)->where('status', 'Active')->count();
        $totalSales = (int) Product::where('user_id', $user->id)->where('status', 'Active')->sum('sold');

        $avgRating = (float) (\App\Models\Review::whereHas('product', fn($q) => $q->where('user_id', $user->id))
            ->visibleToMarketplace()
            ->avg('rating') ?? 0);

        $locations = rescue(fn() => \App\Models\SellerLocation::where('user_id', $user->id)
            ->withCount('employees')
            ->orderBy('created_at', 'desc')
            ->get(), collect());

        return Inertia::render('Seller/Settings/ShopSettings', [
            'user'  => $user,
            'locations' => $locations,
            'stats' => [
                'products' => $productsCount,
                'sales'    => $totalSales,
                'rating'   => number_format($avgRating, 1),
            ],
        ]);
    }

    public function updateSettings(UpdateShopSettingsRequest $request)
    {
        $user = $request->user()->getEffectiveSeller();
        abort_unless($user && $user->isArtisan(), 403, 'Seller workspace access only.');

        $before = [
            'bio' => (string) ($user->bio ?? ''),
            'has_banner' => filled($user->banner_image),
            'has_avatar' => filled($user->avatar),
        ];

        $validated = $request->validated();

        $user->bio = $validated['bio'] ?? null;

        $hasBannerUpdate = false;
        if ($request->filled('banner_key') || ($request->filled('banner_image') && is_string($request->input('banner_image')) && \Illuminate\Support\Facades\Storage::disk('public')->exists($request->input('banner_image')))) {
            $bannerKey = (string) ($request->input('banner_key') ?: $request->input('banner_image'));
            if ($user->banner_image && $user->banner_image !== $bannerKey) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->banner_image);
            }
            $user->banner_image = $bannerKey;
            $hasBannerUpdate = true;
        } elseif ($request->hasFile('banner_image')) {
            if ($user->banner_image) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->banner_image);
            }
            $bannerPath = \App\Services\ImageOptimizer::storeOptimized($request->file('banner_image'), 'shop_banners', 1600);
            $user->banner_image = $bannerPath;
            $hasBannerUpdate = true;
        }

        $hasAvatarUpdate = false;
        if ($request->filled('avatar_key') || ($request->filled('avatar') && is_string($request->input('avatar')) && \Illuminate\Support\Facades\Storage::disk('public')->exists($request->input('avatar')))) {
            $avatarKey = (string) ($request->input('avatar_key') ?: $request->input('avatar'));
            if ($user->avatar && $user->avatar !== $avatarKey) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar);
            }
            $user->avatar = $avatarKey;
            $hasAvatarUpdate = true;
        } elseif ($request->hasFile('avatar')) {
            if ($user->avatar) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->avatar);
            }
            $avatarPath = \App\Services\ImageOptimizer::storeAvatar($request->file('avatar'));
            $user->avatar = $avatarPath;
            $hasAvatarUpdate = true;
        }

        $user->save();

        $lines = array_values(array_filter([
            $hasBannerUpdate ? 'Updated shop banner image' : null,
            $hasAvatarUpdate ? 'Updated shop avatar image' : null,
            array_key_exists('bio', $validated) ? 'Updated shop bio' : null,
        ]));

        ShopSettingsUpdated::dispatch($user, $request->user(), $before, $lines);

        return redirect()->back()->with('success', 'Shop settings updated successfully.');
    }

    /**
     * Generate a presigned direct-to-cloud upload URL for shop avatar or banner.
     */
    public function presign(Request $request)
    {
        $user = $request->user()?->getEffectiveSeller();
        abort_unless($user && $user->isArtisan(), 403, 'Seller workspace access only.');

        $request->validate([
            'filename' => 'required|string',
            'contentType' => 'required|string',
            'type' => 'nullable|string|in:avatar,banner',
        ]);

        $filename = $request->input('filename');
        $extension = strtolower(pathinfo($filename, PATHINFO_EXTENSION));
        $allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'gif'];

        if (!in_array($extension, $allowedExtensions, true)) {
            return response()->json(['error' => 'Invalid image file type. Allowed: jpg, jpeg, png, webp, gif.'], 400);
        }

        $type = $request->input('type', 'avatar');
        $contentType = $request->input('contentType') ?: 'image/' . ($extension === 'jpg' ? 'jpeg' : $extension);

        $folder = $type === 'banner' ? 'shop_banners' : 'avatars';
        $key = $folder . '/' . Str::uuid() . '.' . $extension;

        /** @var \Illuminate\Filesystem\FilesystemAdapter $disk */
        $disk = \Illuminate\Support\Facades\Storage::disk('public');
        $driver = config('filesystems.disks.public.driver');

        if ($driver === 's3') {
            $client = $disk->getClient();
            $bucket = config('filesystems.disks.public.bucket');
            $command = $client->getCommand('PutObject', [
                'Bucket' => $bucket,
                'Key' => $key,
                'ContentType' => $contentType,
            ]);
            $presignedRequest = $client->createPresignedRequest($command, '+20 minutes');
            $url = (string) $presignedRequest->getUri();
        } else {
            $url = route('shop.settings.local-upload') . '?key=' . urlencode($key);
        }

        return response()->json([
            'url' => $url,
            'key' => $key,
        ]);
    }

    /**
     * Local upload fallback for direct-to-cloud PUT simulation on local environment.
     */
    public function localUpload(Request $request)
    {
        $key = $request->query('key');
        if (!$key) {
            return response()->json(['error' => 'Missing key parameter'], 400);
        }

        if (!Str::startsWith($key, ['avatars/', 'shop_banners/'])) {
            return response()->json(['error' => 'Invalid upload destination key'], 403);
        }

        $content = $request->getContent();
        if (empty($content)) {
            return response()->json(['error' => 'No content received'], 400);
        }

        if (Str::startsWith($key, 'avatars/') && strlen($content) > 10485760) {
            return response()->json(['error' => 'Avatar exceeds 10MB upload limit'], 413);
        }

        if (Str::startsWith($key, 'shop_banners/') && strlen($content) > 5242880) {
            return response()->json(['error' => 'Banner exceeds 5MB upload limit'], 413);
        }

        \Illuminate\Support\Facades\Storage::disk('public')->put($key, $content);

        return response()->json(['success' => true]);
    }

    /**
     * Retrieve the aggregated and cached shop analytics rollup data.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \App\Services\ShopAnalyticsService  $analyticsService
     * @return \Illuminate\Http\JsonResponse
     */
    public function analyticsRollup(Request $request, \App\Services\ShopAnalyticsService $analyticsService)
    {
        $user = $request->user()->getEffectiveSeller();
        abort_unless($user && $user->isArtisan(), 403, 'Seller workspace access only.');

        $date = $request->input('date');
        $threshold = $request->input('threshold', 5);

        $rollup = $analyticsService->getAnalyticsRollup($user->id, $date, (int) $threshold);

        return response()->json([
            'success' => true,
            'data' => $rollup,
        ]);
    }
}
