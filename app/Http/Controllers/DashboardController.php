<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    use InteractsWithSellerContext;

    public function index(Request $request)
    {
        try {
            /** @var \App\Models\User $user */
            $user = $request->user();

            if ($user->isAdmin()) {
                return redirect()->route('admin.dashboard');
            }

            if ($user->isStaff()) {
                if (!$user->canAccessSellerWorkspace()) {
                    return redirect()->route('staff.home');
                }

                return redirect()->route('staff.dashboard');
            } elseif (!$user->isArtisan()) {
                return redirect('/shop');
            }

            if ($user->isArtisan() && is_null($user->setup_completed_at)) {
                return redirect()->route('artisan.setup');
            }

            if ($user->isArtisan() && $user->isPendingApproval()) {
                return redirect()->route('artisan.pending');
            }

            if ($user->isArtisan() && $user->isRejected()) {
                return redirect()->route('artisan.setup');
            }

            $seller = $user->getEffectiveSeller() ?? $user;
            $userId = $seller->id;

            $cachedMetrics = $this->getSellerDashboardMetrics($userId);

            // Extract cached variables
            extract($cachedMetrics);

            $query = Order::where('artisan_id', $userId)
                ->with(['items', 'user'])
                ->orderBy('created_at', 'desc');

            if ($request->filled('search')) {
                $search = $request->search;
                $query->where(function ($q) use ($search) {
                    $q->where('order_number', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%");
                });
            }

            if ($request->filled('status') && $request->status !== 'All') {
                $query->where('status', $request->status);
            }

            if ($request->filled('date')) {
                try {
                    $date = Carbon::parse($request->date);
                    $query->whereDate('created_at', $date);
                } catch (\Exception $e) {
                    // Ignore invalid date.
                }
            }

            $recentOrdersPaginator = $query->paginate(5)->withQueryString();

            $recentOrders = [
                'data' => collect($recentOrdersPaginator->items())->map(function ($order) {
                    return [
                        'id' => $order->order_number,
                        'customer' => $order->customer_name,
                        'customer_avatar' => $order->user->avatar ?? null,
                        'date' => $order->created_at->format('M d, Y'),
                        'amount' => $order->seller_net_amount,
                        'status' => $order->status,
                        'img' => $order->items->first()->product_img ?? null,
                    ];
                }),
                'links' => $recentOrdersPaginator->linkCollection(),
                'current_page' => $recentOrdersPaginator->currentPage(),
                'last_page' => $recentOrdersPaginator->lastPage(),
                'total' => $recentOrdersPaginator->total(),
            ];

            $pendingRequests = \App\Models\StockRequest::where('user_id', $userId)
                ->where('status', 'pending')
                ->count();

            $totalDeductions = \App\Models\StockRequest::where('user_id', $userId)
                ->whereIn('status', [
                    'accounting_approved',
                    'ordered',
                    'partially_received',
                    'received',
                    'completed',
                    ])
                ->sum('total_cost');

            return Inertia::render('Dashboard', [
                'metrics' => [
                    'revenue' => $revenueData['value'] ?? 0,
                    'revenue_growth' => $revenueData['growth'] ?? 0,
                    'orders' => $ordersData['value'] ?? 0,
                    'orders_growth' => $ordersData['growth'] ?? 0,
                    'customers' => $customersData['value'] ?? 0,
                    'customers_growth' => $customersData['growth'] ?? 0,
                    'avg_value' => $avgValue ?? 0,
                    'avg_growth' => $avgGrowth ?? 0,
                    'pending_requests' => $pendingRequests ?? 0,
                    'total_deductions' => $totalDeductions ?? 0,
                    'pending_orders' => $pendingOrders ?? 0,
                    'stalled_orders' => $stalledOrders ?? 0,
                    'low_stock_count' => $lowStockProducts ?? 0,
                ],
                'subscription' => [
                    'plan' => $seller->premium_tier ?? 'Basic',
                    'activeCount' => 0,
                    'limit' => 5,
                ],
                'chartData' => ['monthly' => $monthlyData ?? [], 'yearly' => $yearlyData ?? []],
                'categoryData' => $categoryData ?? [],
                'recentOrders' => $recentOrders ?? ['data' => [], 'links' => [], 'current_page' => 1, 'last_page' => 1, 'total' => 0],
                'filters' => $request->only(['search', 'status', 'date']),
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Dashboard error: " . $e->getMessage());
            return Inertia::render('Dashboard', [
                'metrics' => [
                    'revenue' => 0, 'revenue_growth' => 0, 'orders' => 0, 'orders_growth' => 0,
                    'customers' => 0, 'customers_growth' => 0, 'avg_value' => 0, 'avg_growth' => 0,
                    'pending_requests' => 0, 'total_deductions' => 0, 'pending_orders' => 0,
                    'stalled_orders' => 0, 'low_stock_count' => 0,
                ],
                'subscription' => ['plan' => 'Basic', 'activeCount' => 0, 'limit' => 5],
                'chartData' => ['monthly' => [], 'yearly' => []],
                'categoryData' => [],
                'recentOrders' => ['data' => [], 'links' => [], 'current_page' => 1, 'last_page' => 1, 'total' => 0],
                'filters' => [],
                'db_error' => true 
            ]);
        }
    }

    private function monthNumberExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "CAST(strftime('%m', {$column}) AS INTEGER)",
            'pgsql' => "EXTRACT(MONTH FROM {$column})",
            default => "MONTH({$column})",
        };
    }

    private function yearNumberExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "CAST(strftime('%Y', {$column}) AS INTEGER)",
            'pgsql' => "EXTRACT(YEAR FROM {$column})",
            default => "YEAR({$column})",
        };
    }

    private function getSellerDashboardMetrics(int|string $userId): array
    {
        $cacheKey = "seller_dashboard_metrics_{$userId}";
        return Cache::remember($cacheKey, 300, function () use ($userId) {
            $getMetricWithGrowth = function ($column, $aggregate = 'count') use ($userId) {
                $now = Carbon::now();
                $startThisMonth = $now->copy()->startOfMonth();
                $startLastMonth = $now->copy()->subMonth()->startOfMonth();
                $endLastMonth = $now->copy()->subMonth()->endOfMonth();

                $q = Order::where('artisan_id', $userId)
                    ->where('status', 'Completed');

                $currentVal = (clone $q)->where('created_at', '>=', $startThisMonth);
                $current = $aggregate === 'sum'
                    ? $currentVal->sum($column)
                    : ($aggregate === 'distinct' ? $currentVal->distinct($column)->count($column) : $currentVal->count());

                $prevVal = (clone $q)->whereBetween('created_at', [$startLastMonth, $endLastMonth]);
                $previous = $aggregate === 'sum'
                    ? $prevVal->sum($column)
                    : ($aggregate === 'distinct' ? $prevVal->distinct($column)->count($column) : $prevVal->count());

                $growth = 0;
                if ($previous > 0) {
                    $growth = (($current - $previous) / $previous) * 100;
                } elseif ($current > 0) {
                    $growth = 100;
                }

                return ['value' => $current, 'growth' => round($growth, 1)];
            };

            $revenueData = $getMetricWithGrowth('seller_net_amount', 'sum');
            $ordersData = $getMetricWithGrowth('id', 'count');
            $customersData = $getMetricWithGrowth('user_id', 'distinct');
            $avgValue = $ordersData['value'] > 0 ? $revenueData['value'] / $ordersData['value'] : 0;

            $prevRev = Order::where('artisan_id', $userId)
                ->where('status', 'Completed')
                ->whereBetween('created_at', [Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth()])
                ->sum('seller_net_amount');
            $prevOrd = Order::where('artisan_id', $userId)
                ->where('status', 'Completed')
                ->whereBetween('created_at', [Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth()])
                ->count();
            $prevAvg = $prevOrd > 0 ? $prevRev / $prevOrd : 0;

            $avgGrowth = 0;
            if ($prevAvg > 0) {
                $avgGrowth = round((($avgValue - $prevAvg) / $prevAvg) * 100, 1);
            } elseif ($avgValue > 0) {
                $avgGrowth = 100;
            }

            $monthExpr = $this->monthNumberExpression('created_at');
            $monthlyRaw = Order::where('artisan_id', $userId)
                ->where('status', 'Completed')
                ->where('created_at', '>=', Carbon::now()->subMonths(5)->startOfMonth())
                ->selectRaw("{$monthExpr} as month_num, SUM(seller_net_amount) as value")
                ->groupByRaw($monthExpr)
                ->orderByRaw($monthExpr)
                ->get()
                ->keyBy(fn ($row) => (int) $row->month_num);

            $monthlyData = [];
            for ($i = 5; $i >= 0; $i--) {
                $monthNum = (int) Carbon::now()->subMonths($i)->format('n');
                $monthName = Carbon::now()->subMonths($i)->format('M');
                $monthlyData[] = [
                    'name' => $monthName,
                    'value' => $monthlyRaw->has($monthNum) ? (float) $monthlyRaw[$monthNum]->value : 0,
                ];
            }

            $yearExpr = $this->yearNumberExpression('created_at');
            $yearlyData = Order::where('artisan_id', $userId)
                ->where('status', 'Completed')
                ->selectRaw("{$yearExpr} as year_num, SUM(seller_net_amount) as value")
                ->groupByRaw($yearExpr)
                ->orderByRaw($yearExpr)
                ->get()
                ->map(function ($item) {
                    return ['name' => (string) ((int) $item->year_num), 'value' => (float) $item->value];
                });

            $categoryData = OrderItem::whereHas('order', function ($q) use ($userId) {
                    $q->where('artisan_id', $userId)->where('status', 'Completed');
                })
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->select([
                    DB::raw("COALESCE(products.category, 'Uncategorized') as name"),
                    DB::raw('SUM(order_items.quantity) as value')
                ])
                ->groupBy('products.category')
                ->get()
                ->map(function ($item) {
                    return ['name' => $item->name, 'value' => (int) $item->value];
                })
                ->filter(fn ($item) => $item['value'] > 0)
                ->values();

            $pendingRequests = \App\Models\StockRequest::where('user_id', $userId)
                ->where('status', 'pending')
                ->count();

            $totalDeductions = \App\Models\StockRequest::where('user_id', $userId)
                ->whereIn('status', [
                    'accounting_approved',
                    'ordered',
                    'partially_received',
                    'received',
                    'completed',
                ])
                ->sum('total_cost');

            $pendingOrders = Order::where('artisan_id', $userId)
                ->where('status', 'Pending')
                ->count();

            $stalledOrders = Order::where('artisan_id', $userId)
                ->whereNotIn('status', ['Completed', 'Cancelled', 'Refunded', 'Replaced'])
                ->where('created_at', '<=', Carbon::now()->subDays(3))
                ->count();

            $lowStockProducts = \App\Models\Product::where('user_id', $userId)
                ->where('status', 'Active')
                ->where('stock', '<=', 5)
                ->count();

            return compact(
                'revenueData', 'ordersData', 'customersData', 'avgValue', 'avgGrowth', 
                'monthlyData', 'yearlyData', 'categoryData', 'pendingRequests', 
                'totalDeductions', 'pendingOrders', 'stalledOrders', 'lowStockProducts'
            );
        });
    }
}
