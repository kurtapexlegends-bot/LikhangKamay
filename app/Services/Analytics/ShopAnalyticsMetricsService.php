<?php

namespace App\Services\Analytics;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\Review;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;

class ShopAnalyticsMetricsService
{
    public function getFinancialMetrics(int $sellerId): array
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

    public function getCustomerInsights(int $sellerId): array
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
}
