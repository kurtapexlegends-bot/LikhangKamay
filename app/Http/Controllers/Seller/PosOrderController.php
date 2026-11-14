<?php

namespace App\Http\Controllers\Seller;

use App\Casts\PostgresCompatibleBoolean;
use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\StorePosOrderRequest;
use App\Http\Requests\Seller\UpdatePosQrSettingsRequest;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\SellerLocation;
use App\Models\User;
use App\Services\PosCheckoutService;
use App\Services\StorageUrl;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

class PosOrderController extends Controller
{
    public function index(PosCheckoutService $posCheckoutService): Response
    {
        $user = Auth::user();
        $sellerOwner = $user->getEffectiveSeller() ?: $user;

        $products = Product::query()
            ->with(['discounts', 'recipes.supply:id,name,quantity,unit'])
            ->where('user_id', $sellerOwner->id)
            ->where('status', 'Active')
            ->where('is_b2b_supply', PostgresCompatibleBoolean::dbVal(false))
            ->orderByDesc('stock')
            ->orderBy('name')
            ->get()
            ->map(fn (Product $product) => $this->serializePosProduct($product))
            ->values();

        $baseHistoryQuery = $this->scopedPosHistoryBaseQuery($user, $sellerOwner, $posCheckoutService);
        $historySummary = $this->computeHistorySummary($baseHistoryQuery);

        $rawRecentOrders = (clone $baseHistoryQuery)
            ->with(['items:id,order_id,product_name,quantity,price', 'processedBy:id,name', 'posLocation:id,name,address'])
            ->latest('id')
            ->take(25)
            ->get();

        $historyBranches = $user->isSellerOwner()
            ? SellerLocation::query()
                ->where('user_id', $sellerOwner->id)
                ->active()
                ->orderBy('name')
                ->get(['id', 'name'])
                ->map(fn (SellerLocation $loc) => ['id' => (int) $loc->id, 'name' => (string) $loc->name])
                ->values()
                ->all()
            : [];

        return Inertia::render('Seller/POS/Index', [
            'products' => $products,
            'categories' => $products->pluck('category')->filter()->unique()->values(),
            'recentOrders' => $this->serializePosOrderCollection($rawRecentOrders, $sellerOwner->id),
            'historySummary' => $historySummary,
            'historyBranches' => $historyBranches,
            'lastPosOrder' => session('posReceipt'),
            'canEditPos' => $user->canEditSellerModule('orders'),
            'canVoidPos' => $posCheckoutService->canActorVoidPos($user),
            'voidApprovers' => $posCheckoutService->getVoidApproversForActor($user, $sellerOwner),
            'currentUserHasVoidPin' => $user->hasPosVoidPin(),
            'studioProfile' => $this->serializeStudioProfile($sellerOwner),
        ]);
    }

    public function history(Request $request, PosCheckoutService $posCheckoutService): JsonResponse
    {
        $user = Auth::user();
        $sellerOwner = $user->getEffectiveSeller() ?: $user;

        $scalarString = static function (string $key, string $default = '') use ($request): string {
            $value = $request->input($key);

            return is_scalar($value) ? trim((string) $value) : $default;
        };

        $rawPerPage = $request->input('per_page');
        $perPage = is_numeric($rawPerPage) ? max(10, min(50, (int) $rawPerPage)) : 25;
        $status = $scalarString('status', 'all') ?: 'all';
        $filters = [
            'search' => $scalarString('search', ''),
            'payment_method' => $scalarString('payment_method', 'all') ?: 'all',
            'branch_id' => is_scalar($branchId = $request->input('branch_id')) ? $branchId : null,
            'date_range' => $scalarString('date_range', 'all') ?: 'all',
            'specific_date' => $request->input('specific_date'),
            'date_from' => $request->input('date_from'),
            'date_to' => $request->input('date_to'),
        ];

        $filteredBase = $this->scopedPosHistoryBaseQuery($user, $sellerOwner, $posCheckoutService);
        $this->applyPosHistoryFilters($filteredBase, $filters, $user);

        $summary = $this->computeHistorySummary($filteredBase);

        $pageQuery = (clone $filteredBase)
            ->with(['items:id,order_id,product_name,quantity,price', 'processedBy:id,name', 'posLocation:id,name,address'])
            ->latest('id');
        $this->applyPosStatusFilter($pageQuery, $status);

        $paginator = $pageQuery->paginate($perPage);

        return response()->json([
            'orders' => $this->serializePosOrderCollection($paginator->getCollection(), $sellerOwner->id),
            'summary' => $summary,
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => max(1, $paginator->lastPage()),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem() ?? 0,
                'to' => $paginator->lastItem() ?? 0,
            ],
        ]);
    }

    public function store(StorePosOrderRequest $request, PosCheckoutService $posCheckoutService): RedirectResponse
    {
        $user = Auth::user();
        $sellerOwner = $user->getEffectiveSeller() ?: $user;

        $order = $posCheckoutService->checkout($user, $sellerOwner, $request->validated(), [
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return redirect()
            ->route('seller.pos.index')
            ->with('success', "Walk-in sale {$order->order_number} recorded.")
            ->with('posReceipt', $this->serializePosOrder($order));
    }

    public function void(Request $request, Order $order, PosCheckoutService $posCheckoutService): RedirectResponse
    {
        $user = Auth::user();
        $sellerOwner = $user->getEffectiveSeller() ?: $user;

        abort_unless(
            ($user->isSellerOwner() || $user->canEditSellerModule('orders'))
                && $posCheckoutService->canActorAccessPosOrder($user, $sellerOwner, $order),
            403,
            'Unauthorized POS order void action.'
        );

        $validated = $request->validate([
            'reason' => ['required', 'string', 'min:5', 'max:255'],
            'supervisor_id' => ['required', 'integer'],
            'supervisor_pin' => ['required', 'digits:6'],
        ], [
            'reason.required' => 'Please enter a reason before voiding a walk-in sale.',
            'reason.min' => 'Void reason must be at least 5 characters.',
            'supervisor_id.required' => 'Select the authorizing Shop Owner, Shop Manager, or Accounting supervisor.',
            'supervisor_pin.required' => 'Enter the authorizing supervisor’s 6-digit Void PIN.',
            'supervisor_pin.digits' => 'Supervisor Void PIN must be exactly 6 numeric digits.',
        ]);

        $voidedOrder = $posCheckoutService->voidOrder(
            $order,
            $user,
            $sellerOwner,
            $validated['reason'],
            [
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ],
            (int) $validated['supervisor_id'],
            (string) $validated['supervisor_pin']
        );

        return redirect()
            ->back()
            ->with('success', "Walk-in sale {$voidedOrder->order_number} voided and inventory restored.");
    }

    public function receipt(Order $order, PosCheckoutService $posCheckoutService)
    {
        $user = Auth::user();
        $sellerOwner = $user->getEffectiveSeller() ?: $user;

        abort_unless(
            $posCheckoutService->canActorAccessPosOrder($user, $sellerOwner, $order),
            403,
            'Unauthorized POS receipt access.'
        );

        $order->loadMissing(['items', 'artisan', 'processedBy', 'posLocation']);
        $voidLog = ($order->status === Order::STATUS_CANCELLED || $order->payment_status === 'refunded')
            ? SellerActivityLog::query()
                ->with('actor:id,name')
                ->where('seller_owner_id', $sellerOwner->id)
                ->where('event_type', 'pos_walkin_voided')
                ->where('subject_id', $order->id)
                ->latest('id')
                ->first()
            : null;

        return view('pdf.pos_receipt_80mm', [
            'order' => $order,
            'voidLog' => $voidLog,
        ]);
    }

    public function updateQrSettings(UpdatePosQrSettingsRequest $request): RedirectResponse
    {
        $user = Auth::user();
        $sellerOwner = $user->getEffectiveSeller() ?: $user;
        $validated = $request->validated();

        $this->syncQrColumn($sellerOwner, 'pos_gcash_qr_path', $validated['pos_gcash_qr_key'] ?? null, (bool) ($validated['clear_gcash_qr'] ?? false));
        $this->syncQrColumn($sellerOwner, 'pos_maya_qr_path', $validated['pos_maya_qr_key'] ?? null, (bool) ($validated['clear_maya_qr'] ?? false));
        $sellerOwner->save();

        return redirect()->route('seller.pos.index')->with('success', 'Studio e-wallet QR display updated.');
    }

    private function syncQrColumn($sellerOwner, string $column, ?string $newKey, bool $clear): void
    {
        $existingPath = $sellerOwner->{$column};
        if ($clear && !$newKey) {
            if ($existingPath) {
                rescue(fn () => StorageUrl::delete($existingPath), report: false);
            }
            $sellerOwner->{$column} = null;
            return;
        }

        if ($newKey && $newKey !== $existingPath) {
            if ($existingPath) {
                rescue(fn () => StorageUrl::delete($existingPath), report: false);
            }
            $sellerOwner->{$column} = $newKey;
        }
    }

    private function serializePosProduct(Product $product): array
    {
        $bomShortage = null;
        if ($product->production_method === 'manufactured' && $product->recipes->isNotEmpty()) {
            foreach ($product->recipes as $recipe) {
                if ($recipe->supply && (float) $recipe->supply->quantity < (float) $recipe->quantity_required) {
                    $bomShortage = "Low material: {$recipe->supply->name}";
                    break;
                }
            }
        }

        return [
            'id' => $product->id,
            'sku' => $product->sku,
            'name' => $product->name,
            'category' => $product->category,
            'price' => (float) $product->price,
            'effective_price' => (float) $product->effective_price,
            'has_discount' => (bool) $product->has_discount,
            'discount_info' => $product->discount_info,
            'stock' => (int) $product->stock,
            'production_method' => $product->production_method ?? 'resell',
            'bom_shortage' => $bomShortage,
            'img' => $product->img ?: '/images/placeholder.svg',
        ];
    }

    private function scopedPosHistoryBaseQuery(
        User $user,
        User $sellerOwner,
        PosCheckoutService $posCheckoutService
    ): Builder {
        $query = Order::query()
            ->where('artisan_id', $sellerOwner->id)
            ->where('order_type', Order::TYPE_POS_WALKIN);

        $posCheckoutService->applyPosHistoryVisibilityScope($query, $user, $sellerOwner);

        return $query;
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyPosHistoryFilters(Builder $query, array $filters, User $actor): void
    {
        $this->applyPosDateFilters($query, $filters);

        $paymentMethod = (string) ($filters['payment_method'] ?? 'all');
        if (in_array($paymentMethod, ['POS Cash', 'POS GCash', 'POS Maya'], true)) {
            $query->where('payment_method', $paymentMethod);
        }

        $branchId = $filters['branch_id'] ?? null;
        if ($actor->isSellerOwner() && is_numeric($branchId) && (int) $branchId > 0) {
            $query->where('pos_location_id', (int) $branchId);
        }

        $search = mb_substr(trim((string) ($filters['search'] ?? '')), 0, 100);
        if ($search === '') {
            return;
        }

        $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';
        $pattern = "%{$search}%";

        $query->where(function (Builder $sub) use ($pattern, $like) {
            $sub->where('order_number', $like, $pattern)
                ->orWhere('customer_name', $like, $pattern)
                ->orWhere('pos_payment_reference', $like, $pattern)
                ->orWhereHas('processedBy', fn (Builder $q) => $q->where('name', $like, $pattern))
                ->orWhereHas('posLocation', fn (Builder $q) => $q->where('name', $like, $pattern))
                ->orWhereHas('items', fn (Builder $q) => $q->where('product_name', $like, $pattern));
        });
    }

    /**
     * @param  array<string, mixed>  $filters
     */
    private function applyPosDateFilters(Builder $query, array $filters): void
    {
        $dateRange = (string) ($filters['date_range'] ?? 'all');
        $appTz = config('app.timezone');

        if ($dateRange === 'today') {
            $query->where('created_at', '>=', now('Asia/Manila')->startOfDay()->setTimezone($appTz));
            return;
        }

        if ($dateRange === 'yesterday') {
            $yesterday = now('Asia/Manila')->subDay();
            $query->where('created_at', '>=', $yesterday->copy()->startOfDay()->setTimezone($appTz))
                ->where('created_at', '<=', $yesterday->copy()->endOfDay()->setTimezone($appTz));
            return;
        }

        if ($dateRange === '7d') {
            $query->where('created_at', '>=', now('Asia/Manila')->subDays(6)->startOfDay()->setTimezone($appTz));
            return;
        }

        if ($dateRange === '30d') {
            $query->where('created_at', '>=', now('Asia/Manila')->subDays(29)->startOfDay()->setTimezone($appTz));
            return;
        }

        if ($dateRange === 'specific') {
            $day = $this->parseManilaCalendarDate($filters['specific_date'] ?? null);
            if ($day !== null) {
                $query->where('created_at', '>=', $day->copy()->startOfDay()->setTimezone($appTz))
                    ->where('created_at', '<=', $day->copy()->endOfDay()->setTimezone($appTz));
            }
            return;
        }

        if ($dateRange === 'custom') {
            $from = $this->parseManilaCalendarDate($filters['date_from'] ?? null);
            $to = $this->parseManilaCalendarDate($filters['date_to'] ?? null);

            if ($from !== null && $to !== null && $from->gt($to)) {
                [$from, $to] = [$to, $from];
            }

            if ($from !== null) {
                $query->where('created_at', '>=', $from->copy()->startOfDay()->setTimezone($appTz));
            }
            if ($to !== null) {
                $query->where('created_at', '<=', $to->copy()->endOfDay()->setTimezone($appTz));
            }
        }
    }

    private function parseManilaCalendarDate(mixed $rawDate): ?Carbon
    {
        if (!is_string($rawDate)) {
            return null;
        }

        $value = trim($rawDate);
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }

        try {
            $parsed = Carbon::createFromFormat('Y-m-d', $value, 'Asia/Manila');
            return $parsed instanceof Carbon && $parsed->format('Y-m-d') === $value ? $parsed : null;
        } catch (\Throwable) {
            return null;
        }
    }

    private function applyPosStatusFilter(Builder $query, string $status): void
    {
        if ($status === 'completed') {
            $query->where('status', Order::STATUS_COMPLETED)
                ->where(function (Builder $q) {
                    $q->whereNull('payment_status')
                        ->orWhere('payment_status', '!=', 'refunded');
                });
            return;
        }

        if ($status === 'voided') {
            $query->where(function (Builder $q) {
                $q->where('status', '!=', Order::STATUS_COMPLETED)
                    ->orWhere('payment_status', 'refunded');
            });
        }
    }

    /**
     * @return array{all: int, completed: int, voided: int, completed_total: float}
     */
    private function computeHistorySummary(Builder $baseQuery): array
    {
        $row = (clone $baseQuery)
            ->selectRaw(
                'COUNT(*) as all_count, ' .
                'SUM(CASE WHEN status = ? AND (payment_status IS NULL OR payment_status <> ?) THEN 1 ELSE 0 END) as completed_count, ' .
                'SUM(CASE WHEN status <> ? OR payment_status = ? THEN 1 ELSE 0 END) as voided_count, ' .
                'COALESCE(SUM(CASE WHEN status = ? AND (payment_status IS NULL OR payment_status <> ?) THEN total_amount ELSE 0 END), 0) as completed_total',
                [
                    Order::STATUS_COMPLETED,
                    'refunded',
                    Order::STATUS_COMPLETED,
                    'refunded',
                    Order::STATUS_COMPLETED,
                    'refunded',
                ]
            )
            ->first();

        return [
            'all' => (int) ($row->all_count ?? 0),
            'completed' => (int) ($row->completed_count ?? 0),
            'voided' => (int) ($row->voided_count ?? 0),
            'completed_total' => round((float) ($row->completed_total ?? 0), 2),
        ];
    }

    /**
     * @param  Collection<int, Order>  $orders
     * @return array<int, array<string, mixed>>
     */
    private function serializePosOrderCollection(Collection $orders, int $sellerOwnerId): array
    {
        $logsByOrder = $this->loadPosLogsByOrder($sellerOwnerId, $orders->pluck('id')->all());

        return $orders
            ->map(function (Order $order) use ($logsByOrder) {
                $logs = $logsByOrder[$order->id] ?? [];

                return $this->serializePosOrder(
                    $order,
                    $logs['pos_walkin_completed'] ?? null,
                    $logs['pos_walkin_voided'] ?? null
                );
            })
            ->values()
            ->all();
    }

    /**
     * @param  array<int, int>  $orderIds
     * @return array<int, array<string, SellerActivityLog>>
     */
    private function loadPosLogsByOrder(int $sellerOwnerId, array $orderIds): array
    {
        if (empty($orderIds)) {
            return [];
        }

        $logs = SellerActivityLog::query()
            ->with('actor:id,name')
            ->where('seller_owner_id', $sellerOwnerId)
            ->whereIn('event_type', ['pos_walkin_completed', 'pos_walkin_voided'])
            ->whereIn('subject_id', $orderIds)
            ->orderByDesc('id')
            ->get();

        $grouped = [];
        foreach ($logs as $log) {
            $orderId = (int) $log->subject_id;
            if ($orderId <= 0 || isset($grouped[$orderId][$log->event_type])) {
                continue;
            }
            $grouped[$orderId][$log->event_type] = $log;
        }

        return $grouped;
    }

    private function serializePosOrder(
        Order $order,
        ?SellerActivityLog $completedLog = null,
        ?SellerActivityLog $voidedLog = null
    ): array {
        $completedDetails = is_array($completedLog?->details) ? $completedLog->details : [];
        $voidDetails = is_array($voidedLog?->details) ? $voidedLog->details : [];

        return [
            'id' => $order->id,
            'order_number' => $order->order_number,
            'customer_name' => $order->customer_name,
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
            'status' => $order->status,
            'cancellation_reason' => $order->cancellation_reason,
            'merchandise_subtotal' => (float) $order->merchandise_subtotal,
            'total_amount' => (float) $order->total_amount,
            'pos_cash_tendered' => $order->pos_cash_tendered !== null ? (float) $order->pos_cash_tendered : null,
            'pos_change_amount' => $order->pos_change_amount !== null ? (float) $order->pos_change_amount : null,
            'pos_payment_reference' => $order->pos_payment_reference,
            'vat_type' => $order->vat_type ?? 'vat_exempt',
            'vatable_sales' => (float) ($order->vatable_sales ?? 0),
            'vat_amount' => (float) ($order->vat_amount ?? 0),
            'vat_exempt_sales' => (float) ($order->vat_exempt_sales ?? 0),
            'vat_rate' => (float) ($order->vat_rate ?? 12),
            'processed_by' => $order->processedBy?->name ?? 'Studio Owner',
            'actor_role' => $completedDetails['actor_role']
                ?? ((int) $order->pos_processed_by_user_id === (int) $order->artisan_id ? 'Shop Owner' : 'Staff Cashier'),
            'location_name' => $order->posLocation?->name ?? ($completedDetails['location_name'] ?? null),
            'location_address' => $order->posLocation?->address ?? ($completedDetails['location_address'] ?? $order->shipping_address),
            'within_geofence' => array_key_exists('within_geofence', $completedDetails) ? $completedDetails['within_geofence'] : null,
            'distance_meters' => $completedDetails['distance_meters'] ?? null,
            'ip_address' => $completedDetails['ip_address'] ?? null,
            'voided_by' => $voidedLog?->actor?->name,
            'void_approved_by' => $voidDetails['approved_by_name'] ?? $voidedLog?->actor?->name,
            'void_approved_by_role' => $voidDetails['approved_by_role'] ?? null,
            'voided_at' => $order->cancelled_at?->timezone('Asia/Manila')->format('M d, Y h:i A'),
            'created_at' => $order->created_at?->timezone('Asia/Manila')->format('M d, Y h:i A'),
            'receipt_url' => route('seller.pos.receipt', $order->id),
            'items' => $order->items->map(fn ($item) => [
                'id' => $item->id,
                'product_name' => $item->product_name,
                'quantity' => (int) $item->quantity,
                'price' => (float) $item->price,
                'line_total' => round((float) $item->price * (int) $item->quantity, 2),
            ])->values()->all(),
        ];
    }

    private function serializeStudioProfile($sellerOwner): array
    {
        return [
            'shop_name' => $sellerOwner->shop_name ?: $sellerOwner->name,
            'tax_business_name' => $sellerOwner->tax_business_name,
            'tin' => $sellerOwner->tin,
            'is_vat_registered' => (bool) $sellerOwner->is_vat_registered,
            'payout_method' => $sellerOwner->payout_method,
            'payout_account_name' => $sellerOwner->payout_account_name,
            'payout_account_number' => $sellerOwner->payout_account_number,
            'pos_gcash_qr_url' => StorageUrl::url($sellerOwner->pos_gcash_qr_path),
            'pos_maya_qr_url' => StorageUrl::url($sellerOwner->pos_maya_qr_path),
        ];
    }
}
