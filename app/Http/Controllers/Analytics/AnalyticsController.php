<?php

namespace App\Http\Controllers\Analytics;

use App\Http\Controllers\Controller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use App\Services\SponsorshipAnalyticsService;
use App\Services\ShopAnalyticsService;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    use InteractsWithSellerContext;

    public function index(
        Request $request,
        SponsorshipAnalyticsService $sponsorshipAnalyticsService,
        ShopAnalyticsService $shopAnalyticsService
    ) {
        $seller = $this->sellerOwner();
        $sellerId = $seller->id;
        $filter = $request->input('filter', 'monthly');
        $categoryFilter = $request->input('category', 'All Categories');

        $rollup = $shopAnalyticsService->getAnalyticsRollup($sellerId);

        $financials = $this->getFinancialMetrics($sellerId);
        $customerInsights = $this->getCustomerInsights($sellerId);
        $chartData = $this->getSalesChartData($sellerId, $categoryFilter);
        $categoryPerformance = $this->getCategoryPerformance($sellerId);
        $topProducts = $this->getTopProducts($sellerId);
        $reviewStats = $this->getReviewStats($sellerId);
        $intelligence = $this->getSalesIntelligence($sellerId);

        $canViewSponsorshipAnalytics = $seller->isEliteTier();
        $sponsorshipAnalytics = $canViewSponsorshipAnalytics
            ? $sponsorshipAnalyticsService->getSellerAnalytics($sellerId)
            : null;

        $canViewRevenue = $request->user()->hasStaffCapability(User::CAP_VIEW_REVENUE);

        return Inertia::render('Seller/Performance/Performance', [
            'metrics' => [
                'total_revenue' => $canViewRevenue ? $financials['current']['revenue'] : 0,
                'gross_profit' => $canViewRevenue ? $financials['current']['profit'] : 0,
                'profit_margin' => $canViewRevenue ? round($financials['current']['margin'], 1) : 0,
                'growth' => array_merge(
                    $canViewRevenue ? $financials['growth'] : [
                        'revenue' => 0,
                        'orders' => $financials['growth']['orders'],
                        'avg' => 0,
                        'profit' => 0,
                        'margin' => 0,
                    ],
                    ['rating' => $reviewStats['growth']]
                ),
                'average_rating' => $reviewStats['average'],
                'review_stats' => $reviewStats,
                'fulfillment_latency' => $rollup['fulfillment_latency'] ?? [
                    'avg_acceptance_hours' => 0.0,
                    'avg_fulfillment_hours' => 0.0,
                    'avg_delivery_hours' => 0.0,
                ],
            ],
            'financials_masked' => !$canViewRevenue,
            'insights' => [
                'vip_customers' => $customerInsights['vip_customers'],
                'loyalty_stats' => $customerInsights['loyalty_stats'],
                'sales_heatmap' => $intelligence['sales_heatmap'],
                'sales_velocity' => $intelligence['sales_velocity'],
                'slow_movers' => $intelligence['slow_movers'],
                'low_stock_products' => $rollup['low_stock_alerts']['products'] ?? [],
            ],
            'dataContext' => [
                'generated_at' => now()->toIso8601String(),
                'category_filter' => $categoryFilter,
                'source_label' => 'Historical order data and customer feedback records.',
            ],
            'chartData' => $chartData,
            'categoryData' => $categoryPerformance,
            'topProducts' => $topProducts,
            'categories' => $this->getCategoryList($sellerId),
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

    private function getFinancialMetrics(int $sellerId): array
    {
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

        return [
            'current' => $current,
            'growth' => [
                'revenue' => $this->calculatePercentage($current['revenue'], $previous['revenue']),
                'orders' => $this->calculatePercentage($current['orders'], $previous['orders']),
                'avg' => $this->calculatePercentage($current['avg'], $previous['avg']),
                'profit' => $this->calculatePercentage($current['profit'], $previous['profit']),
                'margin' => round($current['margin'] - $previous['margin'], 1),
            ]
        ];
    }

    private function getCustomerInsights(int $sellerId): array
    {
        $customerStatsRaw = Order::query()
            ->join('users', 'orders.user_id', '=', 'users.id')
            ->where('orders.artisan_id', $sellerId)
            ->where('orders.status', 'Completed')
            ->selectRaw('
                orders.user_id, 
                users.name, 
                users.email, 
                users.avatar, 
                COUNT(*) as orders_count, 
                SUM(orders.seller_net_amount) as clv,
                MIN(orders.created_at) as first_purchase_at,
                MAX(orders.created_at) as last_purchase_at
            ')
            ->groupBy('orders.user_id', 'users.name', 'users.email', 'users.avatar')
            ->get();

        $vipCustomers = $customerStatsRaw->sortByDesc('clv')->take(10)->map(fn ($buyer) => [
            'id' => (int) $buyer->user_id,
            'name' => $buyer->name,
            'email' => $buyer->email,
            'avatar' => $buyer->avatar,
            'orders_count' => (int) $buyer->orders_count,
            'clv' => (float) $buyer->clv,
            'last_active' => Carbon::parse($buyer->last_purchase_at)->diffForHumans(),
        ])->values();

        return [
            'vip_customers' => $vipCustomers,
            'loyalty_stats' => [
                'new' => $customerStatsRaw->filter(fn($c) => $c->orders_count === 1)->count(),
                'returning' => $customerStatsRaw->filter(fn($c) => $c->orders_count > 1)->count(),
                'total_unique' => $customerStatsRaw->count(),
            ]
        ];
    }

    private function getSalesChartData(int $sellerId, string $categoryFilter): array
    {
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
            ->selectRaw("{$monthExpr} as month_num, SUM(orders.seller_net_amount) as value")
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
            ->selectRaw("{$yearExpr} as year_num, SUM(orders.seller_net_amount) as value")
            ->groupByRaw($yearExpr)
            ->orderByRaw($yearExpr)
            ->get()
            ->map(function ($item) {
                return [
                    'name' => (string) ((int) $item->year_num),
                    'value' => (float) $item->value,
                ];
            });

        return [
            'monthly' => $monthlyData,
            'yearly' => $yearlyData
        ];
    }

    private function getCategoryPerformance(int $sellerId): \Illuminate\Support\Collection
    {
        return OrderItem::whereHas('order', function ($query) use ($sellerId) {
            $query->where('artisan_id', $sellerId)
                ->where('status', 'Completed');
        })
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->select([
                'products.category', 
                DB::raw('SUM(order_items.quantity) as volume'),
                DB::raw('SUM(order_items.price * order_items.quantity) as revenue'),
                DB::raw('SUM(order_items.cost * order_items.quantity) as cost')
            ])
            ->groupBy('products.category')
            ->get()
            ->map(function ($item) {
                $profit = $item->revenue - $item->cost;
                $margin = $item->revenue > 0 ? ($profit / $item->revenue) * 100 : 0;
                
                return [
                    'category' => $item->category,
                    'value' => (int) $item->volume,
                    'revenue' => (float) $item->revenue,
                    'profit' => (float) $profit,
                    'margin' => round($margin, 1),
                ];
            });
    }

    private function getTopProducts(int $sellerId): \Illuminate\Support\Collection
    {
        return OrderItem::whereHas('order', function ($query) use ($sellerId) {
            $query->where('artisan_id', $sellerId)
                ->where('status', 'Completed');
        })
            ->select([
                'product_name',
                DB::raw('SUM(quantity) as total_sold'),
                DB::raw('SUM(price * quantity) as revenue'),
                DB::raw('SUM(cost * quantity) as total_cost'),
                DB::raw('MAX(product_img) as img')
            ])
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
    }

    private function getReviewStats(int $sellerId): array
    {
        $now = Carbon::now();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        $reviews = Review::whereHas('product', function ($query) use ($sellerId) {
            $query->where('user_id', $sellerId);
        })->get();

        $reviewsLastMonth = $reviews->filter(function ($r) use ($endOfLastMonth) {
            return $r->created_at <= $endOfLastMonth;
        });

        $averageRating = $reviews->count() > 0 ? $reviews->avg('rating') : 0;
        $averageRatingLastMonth = $reviewsLastMonth->count() > 0 ? $reviewsLastMonth->avg('rating') : 0;
        $ratingGrowth = $averageRatingLastMonth > 0 ? $this->calculatePercentage($averageRating, $averageRatingLastMonth) : 0;

        return [
            'total' => $reviews->count(),
            'average' => $averageRating ? round($averageRating, 1) : 0,
            'growth' => $ratingGrowth,
            'breakdown' => [
                '5' => $reviews->where('rating', 5)->count(),
                '4' => $reviews->where('rating', 4)->count(),
                '3' => $reviews->where('rating', 3)->count(),
                '2' => $reviews->where('rating', 2)->count(),
                '1' => $reviews->where('rating', 1)->count(),
            ],
        ];
    }

    private function getSalesIntelligence(int $sellerId): array
    {
        $dayExpr = $this->dayOfWeekExpression('created_at');
        $hourExpr = $this->hourExpression('created_at');

        $salesHeatmap = Order::query()
            ->where('artisan_id', $sellerId)
            ->where('status', 'Completed')
            ->selectRaw("{$dayExpr} as day, {$hourExpr} as hour, COUNT(*) as count")
            ->groupBy('day', 'hour')
            ->get();

        $velocityData = OrderItem::whereHas('order', function($q) use ($sellerId) {
                $q->where('artisan_id', $sellerId)->where('status', 'Completed');
            })
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->selectRaw("
                products.name,
                AVG({$this->dateDiffExpression('order_items.created_at', 'products.created_at')}) as avg_days_to_sell
            ")
            ->groupBy('products.id', 'products.name')
            ->having('avg_days_to_sell', '>', 0)
            ->orderBy('avg_days_to_sell')
            ->take(5)
            ->get();

        $slowMovers = Product::where('user_id', $sellerId)
            ->where('status', 'Active')
            ->whereDoesntHave('orderItems', function($q) {
                $q->where('created_at', '>=', now()->subDays(30));
            })
            ->select(['id', 'name', 'stock', 'created_at'])
            ->take(5)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'stock' => $p->stock,
                'days_inactive' => Carbon::parse($p->created_at)->diffInDays(now()),
            ]);

        return [
            'sales_heatmap' => $salesHeatmap,
            'sales_velocity' => $velocityData,
            'slow_movers' => $slowMovers,
        ];
    }

    private function getCategoryList(int $sellerId): \Illuminate\Support\Collection
    {
        return Product::where('user_id', $sellerId)
            ->distinct()
            ->pluck('category');
    }

    private function calculatePercentage(float|int $current, float|int $previous)
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

    private function dayOfWeekExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "
                CASE CAST(strftime('%w', {$column}) AS INTEGER)
                    WHEN 0 THEN 'Sun'
                    WHEN 1 THEN 'Mon'
                    WHEN 2 THEN 'Tue'
                    WHEN 3 THEN 'Wed'
                    WHEN 4 THEN 'Thu'
                    WHEN 5 THEN 'Fri'
                    ELSE 'Sat'
                END",
            'pgsql' => "to_char({$column}, 'Dy')",
            default => "
                CASE DAYOFWEEK({$column})
                    WHEN 1 THEN 'Sun'
                    WHEN 2 THEN 'Mon'
                    WHEN 3 THEN 'Tue'
                    WHEN 4 THEN 'Wed'
                    WHEN 5 THEN 'Thu'
                    WHEN 6 THEN 'Fri'
                    ELSE 'Sat'
                END",
        };
    }

    private function hourExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "CAST(strftime('%H', {$column}) AS INTEGER)",
            'pgsql' => "EXTRACT(HOUR FROM {$column})",
            default => "HOUR({$column})",
        };
    }

    private function dateDiffExpression(string $column1, string $column2): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "(julianday({$column1}) - julianday({$column2}))",
            'pgsql' => "({$column1}::date - {$column2}::date)",
            default => "DATEDIFF({$column1}, {$column2})",
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

        abort_unless(
            $request->user()->hasStaffCapability(User::CAP_VIEW_REVENUE),
            403,
            'You do not have permission to view or export financial analytics data.'
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
            ->select([
                'product_name',
                DB::raw('SUM(quantity) as total_sold'),
                DB::raw('SUM(price * quantity) as total_revenue'),
                DB::raw('SUM(cost * quantity) as total_cost')
            ])
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
                $revenue = (float) ($data->revenue ?? 0);
                $cost = (float) ($data->cost ?? 0);
                $profit = $revenue - $cost;
                $margin = $revenue > 0 ? ($profit / $revenue) * 100 : 0;
                fputcsv($file, [$data->month, $revenue, $cost, $profit, round($margin, 1), $data->order_count]);
            }

            fputcsv($file, []);
            fputcsv($file, []);

            fputcsv($file, ['TOP SELLING PRODUCTS']);
            fputcsv($file, ['Product Name', 'Units Sold', 'Total Revenue', 'Total Cost', 'Gross Profit', 'Margin (%)']);
            foreach ($topProducts as $product) {
                $totalRevenue = (float) ($product->total_revenue ?? 0);
                $totalCost = (float) ($product->total_cost ?? 0);
                $profit = $totalRevenue - $totalCost;
                $margin = $totalRevenue > 0 ? ($profit / $totalRevenue) * 100 : 0;
                fputcsv($file, [$product->product_name, $product->total_sold, $totalRevenue, $totalCost, $profit, round($margin, 1)]);
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
