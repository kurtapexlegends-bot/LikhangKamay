<?php

namespace App\Services\Analytics;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use App\Models\SellerAnalyticsSnapshot;
use App\Models\StockRequest;

class ShopAnalyticsMetricsService
{
    public function getFinancialMetrics(int $sellerId): array
    {
        $now = Carbon::now();
        $startOfThisMonth = $now->copy()->startOfMonth();
        $startOfLastMonth = $now->copy()->subMonth()->startOfMonth();
        $endOfLastMonth = $now->copy()->subMonth()->endOfMonth();

        $getMetrics = function ($start, $end) use ($sellerId) {
            $data = SellerAnalyticsSnapshot::query()
                ->where('seller_id', $sellerId)
                ->whereBetween('snapshot_date', [
                    $start->copy()->startOfDay(),
                    $end->copy()->endOfDay(),
                ])
                ->selectRaw('SUM(revenue) as revenue, SUM(cost) as cost, SUM(orders_count) as orders_count')
                ->first();

            $revenue = (float) ($data->revenue ?? 0);
            $cost = (float) ($data->cost ?? 0);
            $ordersCount = (int) ($data->orders_count ?? 0);
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

    public function getSalesChartData(int $sellerId, string $categoryFilter): array
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
        $yearlyRaw = $chartBaseQuery()
            ->selectRaw("{$yearExpr} as year_num, SUM(orders.seller_net_amount) as value")
            ->groupByRaw($yearExpr)
            ->orderByRaw($yearExpr)
            ->get()
            ->keyBy(fn ($row) => (int) $row->year_num);

        $currentYear = (int) Carbon::now()->format('Y');
        $oldestYear = $yearlyRaw->keys()->min() ?: $currentYear;
        $startYear = min($oldestYear, $currentYear - 2);

        $yearlyData = [];
        for ($year = $startYear; $year <= $currentYear; $year++) {
            $yearlyData[] = [
                'name' => (string) $year,
                'value' => $yearlyRaw->has($year) ? (float) $yearlyRaw[$year]->value : 0.0,
            ];
        }

        return [
            'monthly' => $monthlyData,
            'yearly' => $yearlyData
        ];
    }

    public function getCategoryPerformance(int $sellerId): Collection
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

    public function getTopProducts(int $sellerId): Collection
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

    public function getReviewStats(int $sellerId): array
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

    public function getSalesIntelligence(int $sellerId): array
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

    public function getCategoryList(int $sellerId): Collection
    {
        return Product::where('user_id', $sellerId)
            ->distinct()
            ->pluck('category');
    }

    public function calculatePercentage(float|int $current, float|int $previous)
    {
        if ($previous == 0) {
            return $current > 0 ? 100 : 0;
        }

        return round((($current - $previous) / $previous) * 100, 1);
    }

    public function monthNumberExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "CAST(strftime('%m', {$column}) AS INTEGER)",
            'pgsql' => "EXTRACT(MONTH FROM {$column})",
            default => "MONTH({$column})",
        };
    }

    public function yearNumberExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "CAST(strftime('%Y', {$column}) AS INTEGER)",
            'pgsql' => "EXTRACT(YEAR FROM {$column})",
            default => "YEAR({$column})",
        };
    }

    public function dayOfWeekExpression(string $column): string
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

    public function hourExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "CAST(strftime('%H', {$column}) AS INTEGER)",
            'pgsql' => "EXTRACT(HOUR FROM {$column})",
            default => "HOUR({$column})",
        };
    }

    public function dateDiffExpression(string $column1, string $column2): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "(julianday({$column1}) - julianday({$column2}))",
            'pgsql' => "({$column1}::date - {$column2}::date)",
            default => "DATEDIFF({$column1}, {$column2})",
        };
    }

    public function yearMonthExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM')",
            default => "DATE_FORMAT({$column}, '%Y-%m')",
        };
    }

    /**
     * Aggregate all dashboard metrics for the seller.
     *
     * @param int|string $userId
     * @return array
     */
    public function getSellerDashboardMetrics(int|string $userId): array
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
            $yearlyRaw = Order::where('artisan_id', $userId)
                ->where('status', 'Completed')
                ->selectRaw("{$yearExpr} as year_num, SUM(seller_net_amount) as value")
                ->groupByRaw($yearExpr)
                ->orderByRaw($yearExpr)
                ->get()
                ->keyBy(fn ($row) => (int) $row->year_num);

            $currentYear = (int) Carbon::now()->format('Y');
            $oldestYear = $yearlyRaw->keys()->min() ?: $currentYear;
            $startYear = min($oldestYear, $currentYear - 2);

            $yearlyData = [];
            for ($year = $startYear; $year <= $currentYear; $year++) {
                $yearlyData[] = [
                    'name' => (string) $year,
                    'value' => $yearlyRaw->has($year) ? (float) $yearlyRaw[$year]->value : 0.0,
                ];
            }

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

            $pendingRequests = StockRequest::where('user_id', $userId)
                ->where('status', 'pending')
                ->count();

            $totalDeductions = StockRequest::where('user_id', $userId)
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

            $lowStockProducts = Product::where('user_id', $userId)
                ->whereIn('status', ['Active', 'pending_review', 'flagged', 'rejected'])
                ->where('stock', '<', 10)
                ->count();

            return compact(
                'revenueData', 'ordersData', 'customersData', 'avgValue', 'avgGrowth', 
                'monthlyData', 'yearlyData', 'categoryData', 'pendingRequests', 
                'totalDeductions', 'pendingOrders', 'stalledOrders', 'lowStockProducts'
            );
        });
    }
}
