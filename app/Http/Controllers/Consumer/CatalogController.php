<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Services\CatalogService;
use App\Services\AuthRedirectService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class CatalogController extends Controller
{
    /**
     * Display the consumer landing welcome page.
     */
    public function home(Request $request, CatalogService $catalogService, AuthRedirectService $authRedirectService)
    {
        // Smart Landing: Redirect Artisans and Admins to their workspace if they land on the home page
        if ($user = $request->user()) {
            $landingPath = $authRedirectService->pathForVerifiedUser($user);
            
            if ($landingPath !== '/') {
                return redirect()->to($landingPath);
            }
        }

        try {
            $sponsoredProducts = $catalogService->getSponsoredProducts();
            $featuredProducts = $catalogService->getFeaturedProducts(
                collect($sponsoredProducts)->pluck('id')->all()
            );
            $topSellers = $catalogService->getTopSellers();
            $categories = $catalogService->getCategories();
        } catch (\Throwable $e) {
            $sponsoredProducts = [];
            $featuredProducts = [];
            $topSellers = [];
            $categories = [];
            
            report($e);
        }

        return Inertia::render('Consumer/Welcome', [
            'canLogin' => Route::has('login'),
            'canRegister' => Route::has('register'),
            'featuredProducts' => $featuredProducts,
            'sponsoredProducts' => $sponsoredProducts,
            'topSellers' => $topSellers,
            'categories' => $categories,
        ]);
    }

    /**
     * Display public catalog marketplace with filters and search.
     */
    public function index(Request $request, CatalogService $catalogService)
    {
        $perPage = $this->resolvePerPage($request);

        try {
            $user = $request->user();
            $paginator = $catalogService->paginateCatalog($request, $user, $perPage);

            $sponsoredResults = collect($paginator->items())
                ->filter(fn($p) => !empty($p['is_sponsored']))
                ->values();

            $metadata = $catalogService->getCatalogMetadata();

        } catch (\Throwable $e) {
            $paginator = new \Illuminate\Pagination\LengthAwarePaginator([], 0, $perPage);
            $sponsoredResults = collect();
            $metadata = $catalogService->getEmptyCatalogMetadata();
            
            if (config('app.debug')) {
                report($e);
            }
        }

        return Inertia::render('Consumer/Shop/Catalog', [
            'products' => $paginator,
            'sponsoredProducts' => $sponsoredResults,
            'categories' => $metadata['categories'],
            'availableLocations' => $metadata['locations'],
            'availableMaterials' => $metadata['materials'],
            'categoryCounts' => $metadata['categoryCounts'] ?? [],
            'materialCounts' => $metadata['materialCounts'] ?? [],
            'locationCounts' => $metadata['locationCounts'] ?? [],
            'filters' => $request->only([
                'search', 'category', 'price_min', 'price_max', 'sort', 'locations', 'materials', 'min_rating', 'followed_only', 'per_page'
            ])
        ]);
    }

    /**
     * Resolve pagination item density based on explicit per_page request or mobile User-Agent.
     */
    public function resolvePerPage(Request $request): int
    {
        if ($request->filled('per_page')) {
            $requested = (int) $request->input('per_page');
            if ($requested >= 6 && $requested <= 48) {
                return $requested;
            }
        }

        if ($request->header('Sec-CH-UA-Mobile') === '?1') {
            return 12;
        }

        $userAgent = (string) $request->header('User-Agent');
        if (preg_match('/(android|iphone|ipod|ipad|windows phone|mobile|blackberry|opera mini)/i', $userAgent)) {
            return 12;
        }

        return 24;
    }

    /**
     * Validate active products from a list of IDs.
     */
    public function validateActive(Request $request): \Illuminate\Http\JsonResponse
    {
        $ids = $request->input('ids', []);
        if (empty($ids)) {
            return response()->json([]);
        }

        $activeIds = \App\Models\Product::whereIn('id', $ids)
            ->where('status', 'Active')
            ->pluck('id')
            ->toArray();

        return response()->json($activeIds);
    }
}
