<?php

namespace App\Http\Controllers;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    public function index(Request $request)
    {
        $userId = Auth::id();
        $filter = $request->input('filter', 'monthly'); // 'monthly' or 'yearly'
        $categoryFilter = $request->input('category', 'All Categories');

        // --- 1. CALCULATE REAL GROWTH (Month vs Last Month) ---
        $now = Carbon::now();
        $startOfThisMonth = $now->copy()->startOfMonth();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        // Helper to get metrics for a specific date range
        $getMetrics = function ($start, $end) use ($userId) {
            $data = OrderItem::whereHas('order', function ($q) use ($userId, $start, $end) {
                $q->where('artisan_id', $userId)
                  ->where('status', 'Completed')
                  ->whereBetween('created_at', [$start, $end]);
            })
            ->selectRaw('SUM(price * quantity) as revenue, SUM(cost * quantity) as cost, COUNT(DISTINCT order_id) as orders_count')
            ->first();

            $revenue = $data->revenue ?? 0;
            $cost = $data->cost ?? 0;
            $ordersCount = $data->orders_count ?? 0;
            $profit = $revenue - $cost;

            return [
                'revenue' => $revenue,
                'cost' => $cost,
                'profit' => $profit,
                'orders' => $ordersCount,
                'avg' => $ordersCount > 0 ? $revenue / $ordersCount : 0,
                'margin' => $revenue > 0 ? ($profit / $revenue) * 100 : 0
            ];
        };

        $current = $getMetrics($startOfThisMonth, $now);
        $previous = $getMetrics($startOfLastMonth, $endOfLastMonth);

        $growth = [
            'revenue' => $this->calculatePercentage($current['revenue'], $previous['revenue']),
            'orders' => $this->calculatePercentage($current['orders'], $previous['orders']),
            'avg' => $this->calculatePercentage($current['avg'], $previous['avg']),
            'profit' => $this->calculatePercentage($current['profit'], $previous['profit']),
        ];

        // Pending Orders (Snapshot, no growth needed)
        $pendingOrders = Order::where('artisan_id', $userId)->where('status', 'Pending')->count();


        // --- 2. REVENUE TRENDS (Dashboard-style: Monthly = last 6 months, Yearly = by year) ---
        // Build base query with category filter
        $chartBaseQuery = function() use ($userId, $categoryFilter) {
            $q = OrderItem::query()
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->where('orders.artisan_id', $userId)
                ->where('orders.status', 'Completed');

            if ($categoryFilter !== 'All Categories') {
                $q->where('products.category', $categoryFilter);
            }

            return $q;
        };

        // Monthly: Last 6 months with zero-fill (same as Dashboard)
        $monthExpr = $this->monthNumberExpression('orders.created_at');
        $monthlyRaw = $chartBaseQuery()
            ->where('orders.created_at', '>=', Carbon::now()->subMonths(5)->startOfMonth())
            ->selectRaw("{$monthExpr} as month_num, SUM(order_items.price * order_items.quantity) as value")
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
                'value' => $monthlyRaw->has($monthNum) ? (float) $monthlyRaw[$monthNum]->value : 0
            ];
        }

        // Yearly: All years grouped (same as Dashboard)
        $yearExpr = $this->yearNumberExpression('orders.created_at');
        $yearlyData = $chartBaseQuery()
            ->selectRaw("{$yearExpr} as year_num, SUM(order_items.price * order_items.quantity) as value")
            ->groupByRaw($yearExpr)
            ->orderByRaw($yearExpr)
            ->get()
            ->map(function ($item) {
                return ['name' => (string) ((int) $item->year_num), 'value' => (float) $item->value];
            });


        // --- 3. SALES BY CATEGORY ---
        $categoryData = OrderItem::whereHas('order', function($q) use ($userId) {
                $q->where('artisan_id', $userId)
                  ->where('status', 'Completed');
            })
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->select('products.category', DB::raw('SUM(order_items.quantity) as value'))
            ->groupBy('products.category')
            ->get()
            ->map(function ($item) {
                return [
                    'category' => $item->category,
                    'value' => (int) $item->value,
                ];
            });


        // --- 4. TOP PRODUCTS ---
        $topProducts = OrderItem::whereHas('order', function($q) use ($userId) {
                $q->where('artisan_id', $userId)
                  ->where('status', 'Completed');
            })
            ->select(
                'product_name', 
                DB::raw('SUM(quantity) as total_sold'), 
                DB::raw('SUM(price * quantity) as revenue'),
                DB::raw('SUM(cost * quantity) as total_cost'),
                DB::raw('MAX(product_img) as img')
            )
            ->groupBy('product_name')
            ->orderByDesc('total_sold')
            ->limit(5)
            ->get()
            ->map(function ($item) {
                $profit = $item->revenue - $item->total_cost;
                $margin = $item->revenue > 0 ? ($profit / $item->revenue) * 100 : 0;
                return [
                    'name' => $item->product_name,
                    'sales' => $item->total_sold,
                    'revenue' => $item->revenue,
                    'profit' => $profit,
                    'margin' => round($margin, 1),
                    'img' => $item->img ? (str_starts_with($item->img, 'http') ? $item->img : asset('storage/'.$item->img)) : null
                ];
            });

        // Get List of Categories for the Filter Dropdown
        $categories = Product::where('user_id', $userId)->distinct()->pluck('category');

        // --- 5. REVIEWS AVERAGE & BREAKDOWN ---
        $reviews = Review::whereHas('product', function ($query) use ($userId) {
            $query->where('user_id', $userId);
        })->get();

        $averageRating = $reviews->count() > 0 ? $reviews->avg('rating') : 0;
        
        $reviewStats = [
            'total' => $reviews->count(),
            'average' => $averageRating ? round($averageRating, 1) : 0,
            'breakdown' => [
                '5' => $reviews->where('rating', 5)->count(),
                '4' => $reviews->where('rating', 4)->count(),
                '3' => $reviews->where('rating', 3)->count(),
                '2' => $reviews->where('rating', 2)->count(),
                '1' => $reviews->where('rating', 1)->count(),
            ]
        ];

        return Inertia::render('Seller/Analytics', [
            'metrics' => [
                'total_revenue' => $current['revenue'],
                'gross_profit' => $current['profit'],
                'profit_margin' => round($current['margin'], 1),
                'total_orders' => $current['orders'],
                'avg_order_value' => $current['avg'],
                'pending_orders' => $pendingOrders,
                'growth' => $growth, // Real calculated percentages
                'average_rating' => $reviewStats['average'],
                'review_stats' => $reviewStats
            ],
            'chartData' => ['monthly' => $monthlyData, 'yearly' => $yearlyData],
            'categoryData' => $categoryData,
            'topProducts' => $topProducts,
            'categories' => $categories, // List for dropdown
            'filters' => [
                'time' => $filter,
                'category' => $categoryFilter
            ]
        ]);
    }

    // Helper to calculate percentage difference
    private function calculatePercentage($current, $previous)
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }
        return round((($current - $previous) / $previous) * 100, 1);
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

    private function yearMonthExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM')",
            default => "DATE_FORMAT({$column}, '%Y-%m')",
        };
    }

    /**
     * SELLER: Export analytics report to CSV
     */
    public function export(Request $request)
    {
        $userId = Auth::id();
        $filename = "analytics_report_" . date('Y-m-d_H-i-s') . ".csv";

        $headers = [
            "Content-Type" => "text/csv",
            "Content-Disposition" => "attachment; filename=\"$filename\"",
            "Pragma" => "no-cache",
            "Cache-Control" => "must-revalidate, post-check=0, pre-check=0",
            "Expires" => "0"
        ];

        // 1. Get Monthly Revenue Data (Last 12 Months)
        // Note: Joining order_items is needed for cost calculation
        $revenueData = OrderItem::whereHas('order', function($q) use ($userId) {
                $q->where('artisan_id', $userId)
                  ->where('status', 'Completed')
                  ->where('created_at', '>=', Carbon::now()->subMonths(12));
            })
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->selectRaw("{$this->yearMonthExpression('orders.created_at')} as month, SUM(order_items.price * order_items.quantity) as revenue, SUM(order_items.cost * order_items.quantity) as cost, COUNT(DISTINCT orders.id) as order_count")
            ->groupByRaw($this->yearMonthExpression('orders.created_at'))
            ->orderBy('month', 'desc')
            ->get();

        // 2. Get Top Selling Products
        $topProducts = OrderItem::whereHas('order', function($q) use ($userId) {
                $q->where('artisan_id', $userId)->where('status', 'Completed');
            })
            ->select(
                'product_name', 
                DB::raw('SUM(quantity) as total_sold'), 
                DB::raw('SUM(price * quantity) as total_revenue'),
                DB::raw('SUM(cost * quantity) as total_cost')
            )
            ->groupBy('product_name')
            ->orderByDesc('total_sold')
            ->limit(10)
            ->get();

        $callback = function () use ($revenueData, $topProducts) {
            $file = fopen('php://output', 'w');

            // SECTION 1: MONTHLY PERFORMANCE
            fputcsv($file, ['MONTHLY PERFORMANCE (LAST 12 MONTHS)']);
            fputcsv($file, ['Month', 'Revenue', 'Cost', 'Gross Profit', 'Margin (%)', 'Orders']);
            foreach ($revenueData as $data) {
                $profit = $data->revenue - $data->cost;
                $margin = $data->revenue > 0 ? ($profit / $data->revenue) * 100 : 0;
                fputcsv($file, [$data->month, $data->revenue, $data->cost, $profit, round($margin, 1), $data->order_count]);
            }

            fputcsv($file, []); // Empty line
            fputcsv($file, []); // Empty line

            // SECTION 2: TOP PRODUCTS
            fputcsv($file, ['TOP SELLING PRODUCTS']);
            fputcsv($file, ['Product Name', 'Units Sold', 'Total Revenue', 'Total Cost', 'Gross Profit', 'Margin (%)']);
            foreach ($topProducts as $product) {
                $profit = $product->total_revenue - $product->total_cost;
                $margin = $product->total_revenue > 0 ? ($profit / $product->total_revenue) * 100 : 0;
                fputcsv($file, [$product->product_name, $product->total_sold, $product->total_revenue, $product->total_cost, $profit, round($margin, 1)]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
