<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Services\SponsorshipAnalyticsService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    use InteractsWithSellerContext;

    public function index(Request $request, SponsorshipAnalyticsService $sponsorshipAnalyticsService)
    {
        $seller = $this->sellerOwner();
        $sellerId = $seller->id;
        $filter = $request->input('filter', 'monthly');
        $categoryFilter = $request->input('category', 'All Categories');

        $now = Carbon::now();
        $startOfThisMonth = $now->copy()->startOfMonth();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        $getMetrics = function ($start, $end) use ($sellerId) {
            $data = OrderItem::whereHas('order', function ($query) use ($sellerId, $start, $end) {
                $query->where('artisan_id', $sellerId)
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
                'margin' => $revenue > 0 ? ($profit / $revenue) * 100 : 0,
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

        $pendingOrders = Order::where('artisan_id', $sellerId)
            ->where('status', 'Pending')
            ->count();

        $completedOrdersCount = Order::where('artisan_id', $sellerId)
            ->where('status', 'Completed')
            ->count();

        $stalledOrders = Order::query()
            ->where('artisan_id', $sellerId)
            ->whereNotIn('status', ['Completed', 'Cancelled', 'Refunded', 'Replaced'])
            ->where('created_at', '<=', now()->subDays(3))
            ->count();

        $lowStockProducts = Product::query()
            ->where('user_id', $sellerId)
            ->where('status', 'Active')
            ->where('stock', '<=', 5)
            ->orderBy('stock')
            ->orderBy('name')
            ->take(5)
            ->get(['id', 'name', 'stock', 'sold', 'slug'])
            ->map(fn (Product $product) => [
                'id' => $product->id,
                'name' => $product->name,
                'stock' => (int) $product->stock,
                'sold' => (int) ($product->sold ?? 0),
                'slug' => $product->slug,
            ]);

        $repeatBuyers = Order::query()
            ->join('users', 'orders.user_id', '=', 'users.id')
            ->where('orders.artisan_id', $sellerId)
            ->where('orders.status', 'Completed')
            ->selectRaw('orders.user_id, users.name, COUNT(*) as orders_count, SUM(orders.total_amount) as total_spend')
            ->groupBy('orders.user_id', 'users.name')
            ->havingRaw('COUNT(*) >= 2')
            ->orderByDesc('orders_count')
            ->orderByDesc('total_spend')
            ->take(5)
            ->get()
            ->map(fn ($buyer) => [
                'id' => (int) $buyer->user_id,
                'name' => $buyer->name,
                'orders_count' => (int) $buyer->orders_count,
                'total_spend' => (float) $buyer->total_spend,
            ]);

        $chartBaseQuery = function () use ($sellerId, $categoryFilter) {
            $query = OrderItem::query()
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->join('products', 'order_items.product_id', '=', 'products.id')
                ->where('orders.artisan_id', $sellerId)
                ->where('orders.status', 'Completed');

            if ($categoryFilter !== 'All Categories') {
                $query->where('products.category', $categoryFilter);
            }

            return $query;
        };

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
                'value' => $monthlyRaw->has($monthNum) ? (float) $monthlyRaw[$monthNum]->value : 0,
            ];
        }

        $yearExpr = $this->yearNumberExpression('orders.created_at');
        $yearlyData = $chartBaseQuery()
            ->selectRaw("{$yearExpr} as year_num, SUM(order_items.price * order_items.quantity) as value")
            ->groupByRaw($yearExpr)
            ->orderByRaw($yearExpr)
            ->get()
            ->map(function ($item) {
                return [
                    'name' => (string) ((int) $item->year_num),
                    'value' => (float) $item->value,
                ];
            });

        $categoryData = OrderItem::whereHas('order', function ($query) use ($sellerId) {
            $query->where('artisan_id', $sellerId)
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

        $topProducts = OrderItem::whereHas('order', function ($query) use ($sellerId) {
            $query->where('artisan_id', $sellerId)
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
                    'img' => $item->img
                        ? (str_starts_with($item->img, 'http') ? $item->img : asset('storage/' . $item->img))
                        : null,
                ];
            });

        $categories = Product::where('user_id', $sellerId)
            ->distinct()
            ->pluck('category');

        $reviews = Review::whereHas('product', function ($query) use ($sellerId) {
            $query->where('user_id', $sellerId);
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
            ],
        ];

        $canViewSponsorshipAnalytics = $seller->isEliteTier();
        $sponsorshipAnalytics = $canViewSponsorshipAnalytics
            ? $sponsorshipAnalyticsService->getSellerAnalytics($sellerId)
            : null;

        return Inertia::render('Seller/Analytics', [
            'metrics' => [
                'total_revenue' => $current['revenue'],
                'gross_profit' => $current['profit'],
                'profit_margin' => round($current['margin'], 1),
                'total_orders' => $current['orders'],
                'avg_order_value' => $current['avg'],
                'pending_orders' => $pendingOrders,
                'stalled_orders' => $stalledOrders,
                'growth' => $growth,
                'average_rating' => $reviewStats['average'],
                'review_stats' => $reviewStats,
            ],
            'insights' => [
                'low_stock_products' => $lowStockProducts,
                'repeat_buyers' => $repeatBuyers,
                'stalled_orders' => $stalledOrders,
            ],
            'dataContext' => [
                'generated_at' => now()->toIso8601String(),
                'completed_orders_count' => $completedOrdersCount,
                'category_filter' => $categoryFilter,
                'source_label' => 'Completed orders, active products, and live review records.',
            ],
            'chartData' => ['monthly' => $monthlyData, 'yearly' => $yearlyData],
            'categoryData' => $categoryData,
            'topProducts' => $topProducts,
            'categories' => $categories,
            'sponsorshipMetrics' => $sponsorshipAnalytics['summary'] ?? null,
            'sponsorshipChartData' => $sponsorshipAnalytics['chartData'] ?? null,
            'sponsorshipAnalyticsAvailability' => $sponsorshipAnalytics['availability'] ?? [
                'is_available' => false,
                'state' => 'not_allowed',
                'message' => null,
                'has_activity' => false,
                'has_events_table' => false,
                'has_order_snapshots' => false,
            ],
            'filters' => [
                'time' => $filter,
                'category' => $categoryFilter,
            ],
        ]);
    }

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

    public function export(Request $request, SponsorshipAnalyticsService $sponsorshipAnalyticsService)
    {
        $seller = $this->sellerOwner();
        $sellerId = $seller->id;

        abort_unless(
            $seller->isPremiumTier(),
            403,
            'Analytics export is available on Premium and Elite plans.'
        );

        $filename = 'analytics_report_' . date('Y-m-d_H-i-s') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $revenueData = OrderItem::whereHas('order', function ($query) use ($sellerId) {
            $query->where('artisan_id', $sellerId)
                ->where('status', 'Completed')
                ->where('created_at', '>=', Carbon::now()->subMonths(12));
        })
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->selectRaw("{$this->yearMonthExpression('orders.created_at')} as month, SUM(order_items.price * order_items.quantity) as revenue, SUM(order_items.cost * order_items.quantity) as cost, COUNT(DISTINCT orders.id) as order_count")
            ->groupByRaw($this->yearMonthExpression('orders.created_at'))
            ->orderBy('month', 'desc')
            ->get();

        $topProducts = OrderItem::whereHas('order', function ($query) use ($sellerId) {
            $query->where('artisan_id', $sellerId)
                ->where('status', 'Completed');
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

        $includeSponsorshipAnalytics = $seller->isEliteTier();
        $sponsorshipAnalytics = $includeSponsorshipAnalytics
            ? $sponsorshipAnalyticsService->getSellerAnalytics($sellerId)
            : null;
        $sponsorshipSummary = $sponsorshipAnalytics['summary'] ?? null;
        $sponsorshipMonthly = $sponsorshipAnalytics['chartData']['monthly'] ?? [];
        $sponsorshipAvailability = $sponsorshipAnalytics['availability'] ?? null;

        $callback = function () use (
            $revenueData,
            $topProducts,
            $includeSponsorshipAnalytics,
            $sponsorshipSummary,
            $sponsorshipMonthly,
            $sponsorshipAvailability
        ) {
            $file = fopen('php://output', 'w');

            fputcsv($file, ['MONTHLY PERFORMANCE (LAST 12 MONTHS)']);
            fputcsv($file, ['Month', 'Revenue', 'Cost', 'Gross Profit', 'Margin (%)', 'Orders']);
            foreach ($revenueData as $data) {
                $profit = $data->revenue - $data->cost;
                $margin = $data->revenue > 0 ? ($profit / $data->revenue) * 100 : 0;
                fputcsv($file, [$data->month, $data->revenue, $data->cost, $profit, round($margin, 1), $data->order_count]);
            }

            fputcsv($file, []);
            fputcsv($file, []);

            fputcsv($file, ['TOP SELLING PRODUCTS']);
            fputcsv($file, ['Product Name', 'Units Sold', 'Total Revenue', 'Total Cost', 'Gross Profit', 'Margin (%)']);
            foreach ($topProducts as $product) {
                $profit = $product->total_revenue - $product->total_cost;
                $margin = $product->total_revenue > 0 ? ($profit / $product->total_revenue) * 100 : 0;
                fputcsv($file, [$product->product_name, $product->total_sold, $product->total_revenue, $product->total_cost, $profit, round($margin, 1)]);
            }

            if ($includeSponsorshipAnalytics) {
                fputcsv($file, []);
                fputcsv($file, []);

                if ($sponsorshipAvailability && !$sponsorshipAvailability['is_available']) {
                    fputcsv($file, ['SPONSORED PERFORMANCE']);
                    fputcsv($file, ['Status', 'Message']);
                    fputcsv($file, ['Unavailable', $sponsorshipAvailability['message']]);
                } elseif ($sponsorshipSummary) {
                    fputcsv($file, ['SPONSORED PERFORMANCE SUMMARY']);
                    fputcsv($file, ['Impressions', 'Clicks', 'CTR (%)', 'Sponsored Orders', 'Sponsored Revenue']);
                    fputcsv($file, [
                        $sponsorshipSummary['impressions'],
                        $sponsorshipSummary['clicks'],
                        $sponsorshipSummary['ctr'],
                        $sponsorshipSummary['sponsored_orders'],
                        $sponsorshipSummary['sponsored_revenue'],
                    ]);

                    fputcsv($file, []);
                    fputcsv($file, ['MONTHLY SPONSORED PERFORMANCE']);
                    fputcsv($file, ['Period', 'Impressions', 'Clicks', 'CTR (%)', 'Sponsored Orders', 'Sponsored Revenue']);
                    foreach ($sponsorshipMonthly as $row) {
                        fputcsv($file, [
                            $row['name'],
                            $row['impressions'],
                            $row['clicks'],
                            $row['ctr'],
                            $row['sponsored_orders'],
                            $row['sponsored_revenue'],
                        ]);
                    }
                }
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
