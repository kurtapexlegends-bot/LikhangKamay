<?php

declare(strict_types=1);

namespace App\Http\Controllers\Supplier;

use App\Actions\Audit\RecordAuditActivity;
use App\Http\Controllers\Controller;
use App\Http\Requests\Supplier\SupplierMaterialRequest;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Services\B2BSupplyHubService;
use App\Services\StorageUrl;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

class SupplierPortalController extends Controller
{
    public function __construct(
        private readonly B2BSupplyHubService $supplyHubService,
        private readonly RecordAuditActivity $recordAudit
    ) {}

    /**
     * Pending Approval notice screen for unverified suppliers.
     */
    public function pending(): Response|RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();

        if ($user->isApproved()) {
            return redirect()->route('supplier.dashboard');
        }

        if (is_null($user->setup_completed_at)) {
            return redirect()->route('supplier.setup');
        }

        return Inertia::render('Supplier/PendingApproval', [
            'supplierName' => $user->shop_name ?: $user->name,
            'status' => $user->artisan_status,
            'rejectionReason' => $user->artisan_rejection_reason,
            'submittedAt' => $user->setup_completed_at?->format('M d, Y h:i A'),
        ]);
    }

    /**
     * Dedicated Supplier Dashboard with KPI analytics and quick actions.
     */
    public function dashboard(Request $request): Response
    {
        /** @var User $user */
        $user = Auth::user();

        $materialsCount = Product::where('user_id', $user->id)
            ->where('is_b2b_supply', DB::raw('true'))
            ->count();

        $totalUnits = (int) Product::where('user_id', $user->id)
            ->where('is_b2b_supply', DB::raw('true'))
            ->sum('stock');

        $activeOrdersCount = Order::where('artisan_id', $user->id)
            ->whereHas('items', fn ($q) => $q->where('is_b2b_supply', DB::raw('true')))
            ->whereIn('status', ['Pending', 'Accepted', 'Processing', 'Shipped', 'Ready for Pickup'])
            ->count();

        $totalRevenue = (float) Order::where('artisan_id', $user->id)
            ->whereHas('items', fn ($q) => $q->where('is_b2b_supply', DB::raw('true')))
            ->where('status', 'Delivered')
            ->sum('total_amount');

        $recentOrders = Order::with(['user:id,name,shop_name,city,avatar', 'items'])
            ->where('artisan_id', $user->id)
            ->whereHas('items', fn ($q) => $q->where('is_b2b_supply', DB::raw('true')))
            ->latest()
            ->take(5)
            ->get()
            ->map(fn (Order $order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'buyer_name' => $order->user?->name ?? 'Artisan Buyer',
                'workshop_name' => $order->user?->shop_name ?: $order->user?->name,
                'city' => $order->user?->city ?? 'Cavite',
                'avatar' => $order->user?->avatar ? \App\Services\StorageUrl::url($order->user->avatar) : null,
                'total_amount' => (float) $order->total_amount,
                'status' => $order->status,
                'created_at' => $order->created_at?->format('M d, Y h:i A'),
                'item_count' => $order->items->count(),
            ]);

        $lowStockMaterials = Product::where('user_id', $user->id)
            ->where('is_b2b_supply', DB::raw('true'))
            ->where('stock', '<=', 10)
            ->orderBy('stock', 'asc')
            ->take(4)
            ->get(['id', 'name', 'stock', 'supply_unit', 'moq', 'price']);

        return Inertia::render('Supplier/Dashboard', [
            'metrics' => [
                'materialsCount' => $materialsCount,
                'totalUnits' => $totalUnits,
                'activeOrdersCount' => $activeOrdersCount,
                'totalRevenue' => $totalRevenue,
            ],
            'recentOrders' => $recentOrders,
            'lowStockMaterials' => $lowStockMaterials,
            'supplier' => [
                'name' => $user->name,
                'shop_name' => $user->shop_name,
                'company_name' => $user->shop_name,
                'city' => $user->city,
                'province' => $user->region,
                'status' => $user->artisan_status,
            ],
        ]);
    }

    /**
     * Manage wholesale raw materials inventory.
     */
    public function materials(Request $request): Response
    {
        /** @var User $user */
        $user = Auth::user();

        $query = Product::where('user_id', $user->id)
            ->where('is_b2b_supply', DB::raw('true'));

        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';

        if ($request->filled('search')) {
            $search = trim((string) $request->search);
            $query->where(function ($q) use ($search, $like) {
                $q->where('name', $like, "%{$search}%")
                  ->orWhere('sku', $like, "%{$search}%")
                  ->orWhere('category', $like, "%{$search}%");
            });
        }

        if ($request->filled('category') && $request->category !== 'All') {
            $query->where('category', $request->category);
        }

        $materials = $query->latest()
            ->paginate(12)
            ->withQueryString()
            ->through(fn (Product $p) => [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'slug' => $p->slug,
                'category' => $p->category,
                'price' => (float) $p->price,
                'stock' => (int) $p->stock,
                'moq' => (int) ($p->moq ?: 1),
                'wholesale_price' => $p->wholesale_price !== null ? (float) $p->wholesale_price : null,
                'wholesale_min_qty' => $p->wholesale_min_qty !== null ? (int) $p->wholesale_min_qty : null,
                'supply_unit' => $p->supply_unit ?: 'pcs',
                'weight' => $p->weight !== null ? (float) $p->weight : null,
                'clay_type' => $p->clay_type,
                'glaze_type' => $p->glaze_type,
                'firing_method' => $p->firing_method,
                'food_safe' => (bool) $p->food_safe,
                'lead_time' => $p->lead_time !== null ? (int) $p->lead_time : 1,
                'status' => $p->status,
                'cover_photo_url' => StorageUrl::url($p->cover_photo_path),
                'description' => $p->description,
            ]);

        return Inertia::render('Supplier/Materials/Index', [
            'materials' => $materials,
            'availableCategories' => B2BSupplyHubService::SUPPLY_CATEGORIES,
            'availableUnits' => B2BSupplyHubService::SUPPLY_UNITS,
            'filters' => [
                'search' => $request->input('search', ''),
                'category' => $request->input('category', 'All'),
            ],
        ]);
    }

    /**
     * Publish a new wholesale bulk raw material.
     */
    public function storeMaterial(SupplierMaterialRequest $request): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();
        $validated = $request->validated();

        $coverPhotoPath = null;
        if ($request->hasFile('cover_photo')) {
            $coverPhotoPath = $request->file('cover_photo')->store('products/covers', 'public');
        }

        $sku = 'B2B-SUP-' . strtoupper(Str::random(6));

        $product = Product::create([
            'user_id' => $user->id,
            'sku' => $sku,
            'name' => trim($validated['name']),
            'category' => $validated['category'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'cost_price' => $validated['price'],
            'stock' => $validated['stock'],
            'moq' => $validated['moq'],
            'wholesale_price' => $validated['wholesale_price'] ?? null,
            'wholesale_min_qty' => $validated['wholesale_min_qty'] ?? null,
            'supply_unit' => $validated['supply_unit'],
            'weight' => $validated['weight'] ?? 1.0,
            'clay_type' => $validated['clay_type'] ?? null,
            'glaze_type' => $validated['glaze_type'] ?? null,
            'firing_method' => $validated['firing_method'] ?? null,
            'food_safe' => isset($validated['food_safe']) ? (bool) $validated['food_safe'] : true,
            'lead_time' => isset($validated['lead_time']) ? (int) $validated['lead_time'] : 1,
            'status' => 'Active',
            'is_b2b_supply' => true,
            'cover_photo_path' => $coverPhotoPath,
        ]);

        $this->recordAudit->execute(
            action: 'supplier_material_created',
            description: "Supplier listed wholesale material: {$product->name} (MOQ: {$product->moq} {$product->supply_unit})",
            subject: $product,
            actorId: $user->id
        );

        return redirect()->route('supplier.materials.index')->with('success', 'Bulk raw material listed successfully on the B2B Supply Hub!');
    }

    /**
     * Update an existing wholesale raw material listing.
     */
    public function updateMaterial(SupplierMaterialRequest $request, Product $product): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();

        if ((int) $product->user_id !== (int) $user->id) {
            abort(403, 'Unauthorized action.');
        }

        $validated = $request->validated();

        $updatePayload = [
            'name' => trim($validated['name']),
            'category' => $validated['category'],
            'description' => $validated['description'] ?? null,
            'price' => $validated['price'],
            'cost_price' => $validated['price'],
            'stock' => $validated['stock'],
            'moq' => $validated['moq'],
            'wholesale_price' => $validated['wholesale_price'] ?? null,
            'wholesale_min_qty' => $validated['wholesale_min_qty'] ?? null,
            'supply_unit' => $validated['supply_unit'],
            'weight' => $validated['weight'] ?? $product->weight,
            'clay_type' => $validated['clay_type'] ?? null,
            'glaze_type' => $validated['glaze_type'] ?? null,
            'firing_method' => $validated['firing_method'] ?? null,
            'food_safe' => isset($validated['food_safe']) ? (bool) $validated['food_safe'] : true,
            'lead_time' => isset($validated['lead_time']) ? (int) $validated['lead_time'] : ($product->lead_time ?: 1),
        ];

        if ($request->hasFile('cover_photo')) {
            $updatePayload['cover_photo_path'] = $request->file('cover_photo')->store('products/covers', 'public');
        }

        $product->update($updatePayload);

        return redirect()->back()->with('success', 'Wholesale material listing updated successfully.');
    }

    /**
     * Remove or archive a wholesale raw material.
     */
    public function destroyMaterial(Product $product): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();

        if ((int) $product->user_id !== (int) $user->id) {
            abort(403, 'Unauthorized action.');
        }

        $product->delete();

        return redirect()->back()->with('success', 'Material listing removed.');
    }

    /**
     * Incoming B2B Procurement Orders from Artisan Workshops.
     */
    public function orders(Request $request): Response
    {
        /** @var User $user */
        $user = Auth::user();

        $statusFilter = $request->input('status', 'all');

        $query = Order::with([
            'user:id,name,shop_name,phone_number,email,city,avatar',
            'items',
            'delivery',
        ])
            ->where('artisan_id', $user->id)
            ->whereHas('items', fn ($q) => $q->where('is_b2b_supply', DB::raw('true')));

        if ($statusFilter !== 'all') {
            $query->where('status', $statusFilter);
        }

        if ($request->filled('search')) {
            $search = trim((string) $request->search);
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';
            $query->where(function ($q) use ($search, $like) {
                $q->where('order_number', $like, "%{$search}%")
                  ->orWhereHas('user', function ($uq) use ($search, $like) {
                      $uq->where('name', $like, "%{$search}%")
                         ->orWhere('shop_name', $like, "%{$search}%");
                  });
            });
        }

        $orders = $query->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Order $order) => [
                'id' => $order->id,
                'order_number' => $order->order_number,
                'buyer' => [
                    'name' => $order->user?->name,
                    'shop_name' => $order->user?->shop_name ?: $order->user?->name,
                    'phone' => $order->user?->phone_number,
                    'email' => $order->user?->email,
                    'city' => $order->user?->city,
                ],
                'status' => $order->status,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
                'shipping_method' => $order->shipping_method,
                'shipping_address' => $order->shipping_address,
                'total_amount' => (float) $order->total_amount,
                'created_at' => $order->created_at?->format('M d, Y h:i A'),
                'items' => $order->items->map(fn ($item) => [
                    'id' => $item->id,
                    'product_name' => $item->product_name,
                    'quantity' => (int) $item->quantity,
                    'price' => (float) $item->price,
                    'supply_unit' => $item->supply_unit ?: 'pcs',
                ]),
            ]);

        return Inertia::render('Supplier/Orders/Index', [
            'orders' => $orders,
            'currentFilter' => $statusFilter,
        ]);
    }

    /**
     * Update wholesale procurement order status (e.g. Processing -> Shipped).
     */
    public function updateOrderStatus(Request $request, Order $order): RedirectResponse
    {
        /** @var User $user */
        $user = Auth::user();

        if ((int) $order->artisan_id !== (int) $user->id) {
            abort(403, 'Unauthorized.');
        }

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:Accepted,Processing,Shipped,Ready for Pickup,Delivered,Cancelled'],
            'notes' => ['nullable', 'string', 'max:500'],
        ]);

        $status = $validated['status'];

        if (in_array($order->status, ['Completed', 'Cancelled'], true)) {
            return redirect()->back()->withErrors([
                'status' => "Order #{$order->order_number} is already {$order->status} and cannot be modified."
            ]);
        }

        DB::transaction(function () use ($order, $status, $validated, $user) {
            $updateData = [
                'status' => $status,
            ];

            if (!empty($validated['notes'])) {
                $updateData['shipping_notes'] = trim((string) $validated['notes']);
            }

            if ($status === 'Accepted') {
                $updateData['accepted_at'] = now();
            } elseif ($status === 'Shipped' || $status === 'Ready for Pickup') {
                $updateData['shipped_at'] = now();
            } elseif ($status === 'Delivered') {
                $updateData['delivered_at'] = now();
                $warrantyExpiry = app(\App\Services\PolicyService::class)->getWarrantyExpirationTimestamp();
                $updateData['auto_complete_at'] = $warrantyExpiry->copy();
                $updateData['warranty_expires_at'] = $warrantyExpiry->copy();
            } elseif ($status === 'Cancelled') {
                $updateData['cancelled_at'] = now();

                // Restore reserved inventory for cancelled wholesale orders
                if ($order->status !== 'Cancelled') {
                    $order->loadMissing('items');
                    foreach ($order->items as $item) {
                        if ($item->product_id) {
                            Product::where('id', $item->product_id)->increment('stock', (int) $item->quantity);
                        }
                    }
                }
            }

            $order->update($updateData);

            $this->recordAudit->execute(
                action: 'supplier_order_status_updated',
                description: "Supplier updated B2B Order #{$order->order_number} status to {$status}",
                subject: $order,
                actorId: $user->id
            );
        });

        return redirect()->back()->with('success', "Order #{$order->order_number} status updated to {$status}.");
    }
}
