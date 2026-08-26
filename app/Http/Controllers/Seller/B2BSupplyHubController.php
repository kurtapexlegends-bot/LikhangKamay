<?php

declare(strict_types=1);

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Http\Requests\CheckoutRequest;
use App\Services\OrderFinanceService;
use App\Actions\Seller\SupplyHub\FetchB2BCatalog;
use App\Actions\Consumer\PrepareCheckout;
use App\Actions\Consumer\PlaceOrder;
use App\Actions\Consumer\ReceiveOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Inertia\Response;

class B2BSupplyHubController extends Controller
{
    public const SUPPLY_CATEGORIES = FetchB2BCatalog::SUPPLY_CATEGORIES;

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
        private readonly FetchB2BCatalog $fetchB2BCatalog
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

        $catalogData = $this->fetchB2BCatalog->execute($request, $actor);

        return Inertia::render('Seller/SupplyHub/Index', $catalogData);
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

        $activeOrdersCount = Order::where('user_id', $actor->id)
            ->whereIn('status', ['Pending', 'Accepted', 'Processing', 'Shipped', 'Ready for Pickup'])
            ->count();

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
            'activeOrdersCount' => $activeOrdersCount,
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
            ? "Published \"{$product->name}\" to peer studio supplies."
            : "Unpublished \"{$product->name}\" from peer studio supplies.";

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Dedicated Material Sourcing Cart Page (Within Seller Workspace Shell).
     */
    public function cart(Request $request): Response
    {
        /** @var User $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The Supply Hub is strictly reserved for verified artisans.');
        }

        $myPublishedCount = Product::where('user_id', $actor->id)
            ->where('is_b2b_supply', true)
            ->count();

        $activeOrdersCount = Order::where('user_id', $actor->id)
            ->whereIn('status', ['Pending', 'Accepted', 'Processing', 'Shipped', 'Ready for Pickup'])
            ->count();

        $cart = (array) Session::get('cart', []);

        return Inertia::render('Seller/SupplyHub/Cart', [
            'cart' => $cart,
            'myPublishedCount' => $myPublishedCount,
            'activeOrdersCount' => $activeOrdersCount,
            'pricing' => OrderFinanceService::getPricingData(),
        ]);
    }

    /**
     * B2B Material Checkout (Within Seller Workspace Shell).
     */
    public function checkout(Request $request, PrepareCheckout $prepareCheckout): Response|\Illuminate\Http\RedirectResponse
    {
        /** @var User $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        $items = $prepareCheckout->execute($request);

        if (empty($items)) {
            return redirect()->route('seller.supply-hub.index')->with('error', 'Your procurement cart is empty.');
        }

        $myPublishedCount = Product::where('user_id', $actor->id)
            ->where('is_b2b_supply', true)
            ->count();

        $activeOrdersCount = Order::where('user_id', $actor->id)
            ->whereIn('status', ['Pending', 'Accepted', 'Processing', 'Shipped', 'Ready for Pickup'])
            ->count();

        return Inertia::render('Seller/SupplyHub/ProcurementCheckout', [
            'items' => $items,
            'pricing' => OrderFinanceService::getPricingData(),
            'myPublishedCount' => $myPublishedCount,
            'activeOrdersCount' => $activeOrdersCount,
            'userAddresses' => $actor->addresses,
        ]);
    }

    /**
     * Place B2B Procurement Order.
     */
    public function storeOrder(CheckoutRequest $request, PlaceOrder $placeOrder)
    {
        /** @var User $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        try {
            $placeOrder->execute($request, $actor);
            return redirect()->route('seller.supply-hub.orders')->with('success', 'Procurement order placed successfully! You can track inbound material shipments here.');
        } catch (\Illuminate\Validation\ValidationException $e) {
            throw $e;
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * Inbound Material Orders Tracker (Within Seller Workspace Shell).
     */
    public function sourcingOrders(Request $request): Response
    {
        /** @var User $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        $statusFilter = $request->input('status', 'all');
        $search = $request->input('search', '');

        $query = Order::with(['items.product', 'seller', 'delivery'])
            ->where('user_id', $actor->id)
            ->latest();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                  ->orWhereHas('items', function ($iq) use ($search) {
                      $iq->where('name', 'like', "%{$search}%");
                  });
            });
        }

        if ($statusFilter !== 'all') {
            if ($statusFilter === 'active') {
                $query->whereIn('status', ['Pending', 'Accepted', 'Processing', 'Shipped', 'Ready for Pickup']);
            } elseif ($statusFilter === 'delivered') {
                $query->where('status', 'Delivered');
            } elseif ($statusFilter === 'completed') {
                $query->where('status', 'Completed');
            } elseif ($statusFilter === 'cancelled') {
                $query->whereIn('status', ['Cancelled', 'Refunded']);
            }
        }

        $orders = $query->paginate(8)->withQueryString();

        $statusCounts = Order::where('user_id', $actor->id)
            ->selectRaw("
                SUM(CASE WHEN status IN ('Pending', 'Accepted', 'Processing', 'Shipped', 'Ready for Pickup') THEN 1 ELSE 0 END) as active_count,
                SUM(CASE WHEN status = 'Delivered' THEN 1 ELSE 0 END) as delivered_count
            ")
            ->first();

        $activeOrdersCount = (int) ($statusCounts->active_count ?? 0);
        $deliveredOrdersCount = (int) ($statusCounts->delivered_count ?? 0);

        $myPublishedCount = Product::where('user_id', $actor->id)
            ->where('is_b2b_supply', true)
            ->count();

        return Inertia::render('Seller/SupplyHub/SourcingOrders', [
            'orders' => $orders,
            'activeOrdersCount' => $activeOrdersCount,
            'deliveredOrdersCount' => $deliveredOrdersCount,
            'myPublishedCount' => $myPublishedCount,
            'filters' => [
                'search' => $search,
                'status' => $statusFilter,
            ],
        ]);
    }

    /**
     * Confirm delivery receipt on a B2B procurement order and auto-restock workshop inventory.
     */
    public function confirmDelivery(int $id, ReceiveOrder $receiveOrder)
    {
        /** @var User $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        try {
            $msg = $receiveOrder->execute((string) $id, $actor);
            return redirect()->back()->with('success', $msg . ' Studio Materials Inventory was automatically restocked with weighted-average unit cost.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }
}
