<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Models\OrderItem;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class DashboardController extends Controller
{
    use InteractsWithSellerContext;

    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        if ($user->isStaff()) {
            if (!$user->canAccessSellerWorkspace()) {
                return redirect()->route('staff.home');
            }

            if (!$user->canAccessSellerModule('overview')) {
                $routeName = $user->getFirstAccessibleSellerRouteName();

                return $routeName
                    ? redirect()->route($routeName)
                    : redirect()->route('staff.home');
            }
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

        $revenueData = $getMetricWithGrowth('total_amount', 'sum');
        $ordersData = $getMetricWithGrowth('id', 'count');
        $customersData = $getMetricWithGrowth('user_id', 'distinct');
        $avgValue = $ordersData['value'] > 0 ? $revenueData['value'] / $ordersData['value'] : 0;

        $prevRev = Order::where('artisan_id', $userId)
            ->where('status', 'Completed')
            ->whereBetween('created_at', [Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth()])
            ->sum('total_amount');
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
            ->selectRaw("{$monthExpr} as month_num, SUM(total_amount) as value")
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
            ->selectRaw("{$yearExpr} as year_num, SUM(total_amount) as value")
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
            ->select(DB::raw('COALESCE(products.category, "Uncategorized") as name'), DB::raw('SUM(order_items.quantity) as value'))
            ->groupBy('products.category')
            ->get()
            ->map(function ($item) {
                return ['name' => $item->name, 'value' => (int) $item->value];
            })
            ->filter(fn ($item) => $item['value'] > 0)
            ->values();

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
                    'amount' => $order->total_amount,
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
                'revenue' => $revenueData['value'],
                'revenue_growth' => $revenueData['growth'],
                'orders' => $ordersData['value'],
                'orders_growth' => $ordersData['growth'],
                'customers' => $customersData['value'],
                'customers_growth' => $customersData['growth'],
                'avg_value' => $avgValue,
                'avg_growth' => $avgGrowth,
                'pending_requests' => $pendingRequests,
                'total_deductions' => $totalDeductions,
            ],
            'subscription' => [
                'plan' => $seller->premium_tier,
                'activeCount' => $seller->products()->where('status', 'Active')->count(),
                'limit' => $seller->getActiveProductLimit(),
            ],
            'chartData' => ['monthly' => $monthlyData, 'yearly' => $yearlyData],
            'categoryData' => $categoryData,
            'recentOrders' => $recentOrders,
            'filters' => $request->only(['search', 'status', 'date']),
        ]);
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
}
