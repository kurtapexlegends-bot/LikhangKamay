<?php

declare(strict_types=1);

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\User;
use App\Services\VehicleTypeResolver;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class B2BSupplyHubController extends Controller
{
    public const SUPPLY_CATEGORIES = [
        'All',
        'Raw Clay & Slips',
        'Glazes & Oxides',
        'Kiln-Dried Wood',
        'Unfinished Blanks',
        'Packaging & Crates',
        'Tools & Workshop',
        'Other',
    ];

    public const SUPPLY_UNITS = [
        'pcs' => 'Pieces (pcs)',
        'kg' => 'Kilograms (kg)',
        'bag' => 'Bags (e.g. 25kg sack)',
        'box' => 'Boxes / Cartons',
        'bundle' => 'Bundles (e.g. wood planks)',
        'liters' => 'Liters / Liquid bottles',
        'set' => 'Sets',
    ];

    public function __construct(
        private readonly VehicleTypeResolver $vehicleTypeResolver
    ) {}

    /**
     * Sourcing Hub: Browse available B2B materials from peer artisans.
     */
    public function index(Request $request): Response
    {
        /** @var User $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        $query = Product::b2bSupplies()
            ->with(['user', 'discounts'])
            ->where('user_id', '!=', $actor->id); // Exclude own products from peer sourcing view

        if ($request->filled('search')) {
            $search = trim((string) $request->search);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%")
                  ->orWhere('clay_type', 'like', "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search) {
                      $uq->where('shop_name', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%")
                        ->orWhere('city', 'like', "%{$search}%");
                  });
            });
        }

        if ($request->filled('category') && $request->category !== 'All') {
            $query->where('category', $request->category);
        }

        $supplies = $query->latest()->paginate(16)->withQueryString();

        // Transform collection to include vehicle estimate metadata
        $supplies->getCollection()->transform(function (Product $product) {
            $moq = max(1, (int) ($product->moq ?: 1));
            $unitWeight = (float) ($product->weight ?: 1.0);
            $moqTotalWeight = round($moq * $unitWeight * 1.10, 1);
            $vehicleInfo = $this->vehicleTypeResolver->mapWeightToVehicle($moqTotalWeight);

            return [
                'id' => $product->id,
                'name' => $product->name,
                'slug' => $product->slug,
                'description' => $product->description,
                'category' => $product->category,
                'price' => (float) $product->price,
                'effective_price' => (float) $product->effective_price,
                'wholesale_price' => $product->wholesale_price !== null ? (float) $product->wholesale_price : null,
                'wholesale_min_qty' => $product->wholesale_min_qty ? (int) $product->wholesale_min_qty : null,
                'moq' => $moq,
                'supply_unit' => $product->supply_unit ?: 'pcs',
                'weight' => $unitWeight,
                'stock' => (int) $product->stock,
                'img' => $product->img,
                'seller' => [
                    'id' => $product->user->id,
                    'name' => $product->user->name,
                    'shop_name' => $product->user->shop_name ?: $product->user->name,
                    'city' => $product->user->city ?? 'Cavite',
                    'is_verified' => $product->user->is_artisan_approved ?? true,
                    'avatar' => $product->user->avatar_url ?? null,
                ],
                'vehicle_preview' => $vehicleInfo,
            ];
        });

        $stats = [
            'total_materials' => Product::b2bSupplies()->where('user_id', '!=', $actor->id)->count(),
            'active_suppliers' => Product::b2bSupplies()->where('user_id', '!=', $actor->id)->distinct('user_id')->count('user_id'),
            'wholesale_deals' => Product::b2bSupplies()->where('user_id', '!=', $actor->id)->whereNotNull('wholesale_price')->count(),
            'my_published_count' => Product::where('user_id', $actor->id)->where('is_b2b_supply', true)->count(),
        ];

        return Inertia::render('Seller/SupplyHub/Index', [
            'supplies' => $supplies,
            'categories' => self::SUPPLY_CATEGORIES,
            'stats' => $stats,
            'filters' => [
                'search' => $request->input('search', ''),
                'category' => $request->input('category', 'All'),
            ],
        ]);
    }

    /**
     * My Wholesale Listings: Manage materials published to the B2B Hub.
     */
    public function myListings(): Response
    {
        /** @var User $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        $products = Product::where('user_id', $actor->id)
            ->orderByDesc('is_b2b_supply')
            ->latest()
            ->get()
            ->map(function (Product $product) {
                return [
                    'id' => $product->id,
                    'name' => $product->name,
                    'sku' => $product->sku,
                    'category' => $product->category,
                    'price' => (float) $product->price,
                    'stock' => (int) $product->stock,
                    'weight' => (float) ($product->weight ?? 1.0),
                    'is_b2b_supply' => (bool) $product->is_b2b_supply,
                    'moq' => (int) ($product->moq ?: 1),
                    'wholesale_price' => $product->wholesale_price !== null ? (float) $product->wholesale_price : null,
                    'wholesale_min_qty' => $product->wholesale_min_qty ? (int) $product->wholesale_min_qty : null,
                    'supply_unit' => $product->supply_unit ?: 'pcs',
                    'img' => $product->img,
                ];
            });

        return Inertia::render('Seller/SupplyHub/MyListings', [
            'products' => $products,
            'availableCategories' => self::SUPPLY_CATEGORIES,
            'availableUnits' => self::SUPPLY_UNITS,
        ]);
    }

    /**
     * Publish or unpublish a product to/from the B2B Supply Hub.
     */
    public function toggle(Request $request, Product $product)
    {
        /** @var User $actor */
        $actor = Auth::user();

        if ($product->user_id !== $actor->id) {
            abort(403, 'Unauthorized product modification.');
        }

        $validated = $request->validate([
            'is_b2b_supply' => ['required', 'boolean'],
            'moq' => ['nullable', 'integer', 'min:1', 'max:10000'],
            'wholesale_price' => ['nullable', 'numeric', 'min:0'],
            'wholesale_min_qty' => ['nullable', 'integer', 'min:2', 'max:10000'],
            'supply_unit' => ['nullable', 'string', 'max:50'],
        ]);

        $product->update([
            'is_b2b_supply' => $validated['is_b2b_supply'],
            'moq' => $validated['moq'] ?? 1,
            'wholesale_price' => $validated['wholesale_price'] ?? null,
            'wholesale_min_qty' => $validated['wholesale_min_qty'] ?? null,
            'supply_unit' => $validated['supply_unit'] ?? ($product->supply_unit ?: 'pcs'),
        ]);

        $msg = $validated['is_b2b_supply']
            ? "Published \"{$product->name}\" to the B2B Supply Hub."
            : "Unpublished \"{$product->name}\" from the B2B Supply Hub.";

        return redirect()->back()->with('success', $msg);
    }
}
