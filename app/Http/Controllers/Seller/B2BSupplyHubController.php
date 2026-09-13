<?php

declare(strict_types=1);

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Http\Requests\CheckoutRequest;
use App\Actions\Seller\SupplyHub\FetchB2BCatalog;
use App\Actions\Consumer\PrepareCheckout;
use App\Actions\Consumer\PlaceOrder;
use App\Actions\Consumer\ReceiveOrder;
use App\Actions\Seller\Orders\UpdateOrderStatus;
use App\Http\Requests\Seller\ToggleWholesaleSupplyRequest;
use App\Http\Requests\Seller\UpdateOrderStatusRequest;
use App\Services\B2BSupplyHubService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Inertia\Inertia;
use Inertia\Response;

class B2BSupplyHubController extends Controller
{
    public const SUPPLY_CATEGORIES = B2BSupplyHubService::SUPPLY_CATEGORIES;
    public const SUPPLY_UNITS = B2BSupplyHubService::SUPPLY_UNITS;

    public function __construct(
        private readonly FetchB2BCatalog $fetchB2BCatalog,
        private readonly B2BSupplyHubService $supplyHubService
    ) {}

    /**
     * Sourcing Hub: Browse available B2B materials from peer artisans.
     */
    public function index(Request $request): Response
    {
        /** @var User|null $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        $seller = $actor->getEffectiveSeller() ?? $actor;
        abort_unless($seller->canAccessSupplyHub(), 403, 'The B2B Supply Hub and wholesale ordering are strictly reserved for Elite artisan shops.');

        try {
            $catalogData = $this->fetchB2BCatalog->execute($request, $actor);
            return Inertia::render('Seller/SupplyHub/Index', $catalogData);
        } catch (\Throwable $e) {
            Log::error('B2BSupplyHubController index error: ' . $e->getMessage(), [
                'exception' => $e,
            ]);

            return Inertia::render('Seller/SupplyHub/Index', [
                'supplies' => new \Illuminate\Pagination\LengthAwarePaginator([], 0, 12),
                'categories' => self::SUPPLY_CATEGORIES,
                'categoryCounts' => [],
                'availableLocations' => [],
                'locationCounts' => [],
                'myPublishedCount' => 0,
                'activeOrdersCount' => 0,
                'wholesaleSalesCount' => 0,
                'cart' => (array) Session::get('cart', []),
                'filters' => [
                    'search' => '',
                    'category' => 'All',
                    'price_min' => '',
                    'price_max' => '',
                    'locations' => '',
                    'has_wholesale' => false,
                    'moq_tier' => 'all',
                    'sort' => 'newest',
                ],
            ]);
        }
    }

    /**
     * My Wholesale Listings: Manage materials published to the B2B Hub.
     */
    public function myListings(): Response
    {
        /** @var User|null $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        $seller = $actor->getEffectiveSeller() ?? $actor;
        abort_unless($seller->canAccessSupplyHub(), 403, 'The B2B Supply Hub and wholesale ordering are strictly reserved for Elite artisan shops.');

        return Inertia::render('Seller/SupplyHub/MyListings', $this->supplyHubService->getMyListingsData($actor));
    }

    /**
     * Publish or unpublish a product to/from the B2B Supply Hub.
     */
    public function toggle(ToggleWholesaleSupplyRequest $request, Product $product)
    {
        /** @var User|null $actor */
        $actor = Auth::user();

        $msg = $this->supplyHubService->updateProductWholesaleSettings($actor, $product, $request->validated());

        return redirect()->back()->with('success', $msg);
    }

    /**
     * Dedicated Material Sourcing Cart Page (Within Seller Workspace Shell).
     */
    public function cart(Request $request): Response
    {
        /** @var User|null $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The Supply Hub is strictly reserved for verified artisans.');
        }

        $seller = $actor->getEffectiveSeller() ?? $actor;
        abort_unless($seller->canAccessSupplyHub(), 403, 'The B2B Supply Hub and wholesale ordering are strictly reserved for Elite artisan shops.');

        return Inertia::render('Seller/SupplyHub/Cart', $this->supplyHubService->getCartData($actor));
    }

    /**
     * B2B Material Checkout (Within Seller Workspace Shell).
     */
    public function checkout(Request $request, PrepareCheckout $prepareCheckout): Response|\Illuminate\Http\RedirectResponse
    {
        /** @var User|null $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        $seller = $actor->getEffectiveSeller() ?? $actor;
        abort_unless($seller->canAccessSupplyHub(), 403, 'The B2B Supply Hub and wholesale ordering are strictly reserved for Elite artisan shops.');

        $items = $prepareCheckout->execute($request);

        if (empty($items)) {
            return redirect()->route('seller.supply-hub.index')->with('error', 'Your procurement cart is empty.');
        }

        return Inertia::render('Seller/SupplyHub/ProcurementCheckout', $this->supplyHubService->getCheckoutData($actor, $items));
    }

    /**
     * Place B2B Procurement Order.
     */
    public function storeOrder(CheckoutRequest $request, PlaceOrder $placeOrder)
    {
        /** @var User|null $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        $seller = $actor->getEffectiveSeller() ?? $actor;
        abort_unless($seller->canAccessSupplyHub(), 403, 'The B2B Supply Hub and wholesale ordering are strictly reserved for Elite artisan shops.');

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
        /** @var User|null $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        return Inertia::render('Seller/SupplyHub/SourcingOrders', $this->supplyHubService->getSourcingOrdersData($actor, $request));
    }

    /**
     * Confirm delivery receipt on a B2B procurement order and auto-restock workshop inventory.
     */
    public function confirmDelivery(string|int $id, ReceiveOrder $receiveOrder)
    {
        /** @var User|null $actor */
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

    /**
     * Wholesale Sales: Orders placed by other artisans for our published materials.
     */
    public function wholesaleSales(Request $request): Response
    {
        /** @var User|null $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        return Inertia::render('Seller/SupplyHub/WholesaleSales', $this->supplyHubService->getWholesaleSalesData($actor, $request));
    }

    /**
     * Update status on a wholesale supply order.
     */
    public function updateWholesaleOrderStatus(
        UpdateOrderStatusRequest $request,
        string $id,
        UpdateOrderStatus $updateOrderStatus
    ) {
        /** @var User|null $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'Unauthorized.');
        }

        $order = Order::where(function ($q) use ($id) {
                $q->where('order_number', $id)->orWhere('id', $id);
            })
            ->where('artisan_id', $actor->id)
            ->firstOrFail();

        $proofPath = null;
        if ($request->hasFile('proof_of_delivery')) {
            $proofPath = $request->file('proof_of_delivery')->store('proofs', 'public');
        }

        try {
            $updateOrderStatus->execute(
                $order,
                $request->only(['status', 'tracking_number', 'shipping_notes']),
                $actor,
                $proofPath
            );
            return redirect()->back()->with('success', 'Wholesale order status updated successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Download or view printable Purchase Order / Commercial Wholesale Invoice.
     */
    public function downloadInvoice(string $id)
    {
        /** @var User|null $actor */
        $actor = Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'The B2B Supply Hub is strictly reserved for verified artisans.');
        }

        $order = $this->supplyHubService->getInvoiceOrder($actor, $id);

        return view('pdf.receipt', ['order' => $order]);
    }
}
