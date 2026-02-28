<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        // 1. ROLE-BASED REDIRECTS

        // Super Admin → Admin Dashboard
        if ($user->isAdmin()) {
            return redirect()->route('admin.dashboard');
        }

        // Buyers → Shop (no seller dashboard for buyers)
        if (!$user->isArtisan()) {
            return redirect('/shop');
        }

        // Artisan without setup → Setup wizard
        if (is_null($user->setup_completed_at)) {
            return redirect()->route('artisan.setup');
        }

        // Artisan pending approval → Pending page
        if ($user->isPendingApproval()) {
            return redirect()->route('artisan.pending');
        }

        // Artisan rejected → Allow resubmit via setup
        if ($user->isRejected()) {
            return redirect()->route('artisan.setup');
        }

        $userId = $user->id;

        // --- HELPER: Calculate Metric & Growth ---
        // This function gets the value for NOW and LAST MONTH, then calculates % difference.
        $getMetricWithGrowth = function ($column, $aggregate = 'count') use ($userId) {
            $now = Carbon::now();
            $startThisMonth = $now->copy()->startOfMonth();
            $startLastMonth = $now->copy()->subMonth()->startOfMonth();
            $endLastMonth = $now->copy()->subMonth()->endOfMonth();

            // Base Query
            $q = Order::where('artisan_id', $userId)
                ->where('status', 'Completed');

            // Current Value
            $currentVal = (clone $q)->where('created_at', '>=', $startThisMonth);
            $current = $aggregate === 'sum' ? $currentVal->sum($column) :
                ($aggregate === 'distinct' ? $currentVal->distinct($column)->count($column) : $currentVal->count());

            // Previous Value
            $prevVal = (clone $q)->whereBetween('created_at', [$startLastMonth, $endLastMonth]);
            $previous = $aggregate === 'sum' ? $prevVal->sum($column) :
                ($aggregate === 'distinct' ? $prevVal->distinct($column)->count($column) : $prevVal->count());

            // Calculate Growth %
            $growth = 0;
            if ($previous > 0) {
                $growth = (($current - $previous) / $previous) * 100;
            } elseif ($current > 0) {
                $growth = 100; // If last month was 0 and this month has data, that's 100% growth
            }

            return ['value' => $current, 'growth' => round($growth, 1)];
        };

        // 2. CALCULATE REAL METRICS
        // A. Total Revenue (Sum of total_amount)
        $revenueData = $getMetricWithGrowth('total_amount', 'sum');

        // B. Total Orders (Count of rows)
        $ordersData = $getMetricWithGrowth('id', 'count');

        // C. Total Customers (Count distinct user_id)
        $customersData = $getMetricWithGrowth('user_id', 'distinct');

        // D. Avg Order Value (Revenue / Orders)
        $avgValue = $ordersData['value'] > 0 ? $revenueData['value'] / $ordersData['value'] : 0;

        // Calculate Avg Growth (Tricky math: % change of the average itself)
        // Previous Avg
        $prevRev = Order::where('artisan_id', $userId)->where('status', 'Completed')
            ->whereBetween('created_at', [Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth()])->sum('total_amount');
        $prevOrd = Order::where('artisan_id', $userId)->where('status', 'Completed')
            ->whereBetween('created_at', [Carbon::now()->subMonth()->startOfMonth(), Carbon::now()->subMonth()->endOfMonth()])->count();
        $prevAvg = $prevOrd > 0 ? $prevRev / $prevOrd : 0;

        $avgGrowth = 0;
        if ($prevAvg > 0) {
            $avgGrowth = round((($avgValue - $prevAvg) / $prevAvg) * 100, 1);
        } elseif ($avgValue > 0) {
            $avgGrowth = 100;
        }

        // 3. CHARTS & LISTS
        // Monthly Data (Last 6 Months, including current)
        $monthlyRaw = Order::where('artisan_id', $userId)
            ->where('status', 'Completed')
            ->where('created_at', '>=', Carbon::now()->subMonths(5)->startOfMonth())
            ->select(DB::raw('DATE_FORMAT(created_at, "%b") as name'), DB::raw('MONTH(created_at) as month_num'), DB::raw('SUM(total_amount) as value'))
            ->groupBy('name', 'month_num')->orderBy('month_num')->get()
            ->keyBy('name');

        $monthlyData = [];
        for ($i = 5; $i >= 0; $i--) {
            $monthName = Carbon::now()->subMonths($i)->format('M');
            $monthlyData[] = [
                'name' => $monthName,
                'value' => $monthlyRaw->has($monthName) ? (float)$monthlyRaw[$monthName]->value : 0
            ];
        }

        $yearlyData = Order::where('artisan_id', $userId)
            ->where('status', 'Completed')
            ->select(DB::raw('YEAR(created_at) as name'), DB::raw('SUM(total_amount) as value'))
            ->groupBy('name')->orderBy('name')->get()
            ->map(function($item) {
                return ['name' => (string)$item->name, 'value' => (float)$item->value];
            });

        $categoryData = OrderItem::whereHas('order', function ($q) use ($userId) {
            $q->where('artisan_id', $userId)->where('status', 'Completed');
        })
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->select(DB::raw('COALESCE(products.category, "Uncategorized") as name'), DB::raw('SUM(order_items.quantity) as value'))
            ->groupBy('products.category')->get()
            ->map(function ($item) {
                return ['name' => $item->name, 'value' => (int)$item->value];
            })
            ->filter(fn ($item) => $item['value'] > 0)
            ->values();

        // RECENT ORDERS with Filtering & Pagination
        $query = Order::where('artisan_id', $userId)
            ->with(['items', 'user'])
            ->orderBy('created_at', 'desc');

        // Apply Search Filter
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('order_number', 'like', "%{$search}%")
                    ->orWhere('customer_name', 'like', "%{$search}%");
            });
        }

        // Apply Status Filter
        if ($request->filled('status') && $request->status !== 'All') {
            $query->where('status', $request->status);
        }

        // Apply Date Filter
        if ($request->filled('date')) {
            try {
                $date = Carbon::parse($request->date);
                $query->whereDate('created_at', $date);
            } catch (\Exception $e) {
                // Ignore invalid date
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
                    'img' => $order->items->first()->product_img ?? null
                ];
            }),
            'links' => $recentOrdersPaginator->linkCollection(),
            'current_page' => $recentOrdersPaginator->currentPage(),
            'last_page' => $recentOrdersPaginator->lastPage(),
            'total' => $recentOrdersPaginator->total(),
        ];

        // Get pending requests count and total deductions (Updated to use StockRequest)
        $pendingRequests = \App\Models\StockRequest::where('user_id', $userId)
            ->where('status', 'pending')
            ->count();

        $totalDeductions = \App\Models\StockRequest::where('user_id', $userId)
            ->whereIn('status', [
                'accounting_approved',
                'ordered',
                'partially_received',
                'received',
                'completed'
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
            'chartData' => ['monthly' => $monthlyData, 'yearly' => $yearlyData],
            'categoryData' => $categoryData,
            'recentOrders' => $recentOrders,
            'filters' => $request->only(['search', 'status', 'date'])
        ]);
    }
}