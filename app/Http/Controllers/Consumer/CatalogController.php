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
        } catch (\Exception $e) {
            $sponsoredProducts = [];
            $featuredProducts = [];
            $topSellers = [];
            $categories = [];
            
            if (config('app.debug')) {
                report($e);
            }
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
        try {
            $isDefaultRequest = !$request->filled('search') &&
                                (!$request->filled('category') || $request->category === 'All') &&
                                !$request->filled('price_min') &&
                                !$request->filled('price_max') &&
                                !$request->filled('locations') &&
                                !$request->filled('materials') &&
                                !$request->filled('min_rating') &&
                                (!$request->filled('sort') || $request->sort === 'newest') &&
                                ((int) $request->get('page', 1) === 1);

            if ($isDefaultRequest) {
                $cacheData = Cache::remember('shop_catalog_default_page_1', 600, function () use ($request, $catalogService) {
                    $query = $catalogService->buildCatalogQuery($request->all());
                    $paginator = $query->paginate(20)->withQueryString();
                    $paginator->through(fn ($product) => $catalogService->serializeCatalogProduct($product));

                    return [
                        'items' => $paginator->items(),
                        'total' => $paginator->total(),
                        'per_page' => $paginator->perPage(),
                        'current_page' => $paginator->currentPage(),
                        'last_page' => $paginator->lastPage(),
                    ];
                });

                $paginator = new \Illuminate\Pagination\LengthAwarePaginator(
                    $cacheData['items'],
                    $cacheData['total'],
                    $cacheData['per_page'],
                    $cacheData['current_page'],
                    ['path' => $request->url(), 'query' => $request->query()]
                );
            } else {
                $query = $catalogService->buildCatalogQuery($request->all());
                $paginator = $query->paginate(20)->withQueryString();
                $paginator->through(fn ($product) => $catalogService->serializeCatalogProduct($product));
            }

            $sponsoredResults = collect($paginator->items())
                ->filter(fn($p) => $p['is_sponsored'])
                ->values();

            $metadata = $catalogService->getCatalogMetadata();

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

        return Inertia::render('Consumer/Shop/Catalog', [
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
}
