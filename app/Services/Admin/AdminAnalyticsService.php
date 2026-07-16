<?php

namespace App\Services\Admin;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class AdminAnalyticsService
{

    public function getInsightsData(): array
    {
        return Cache::remember('admin_insights_data', 3600, function () {
            $transactions = $this->getMarketplaceVelocityData();
            $churn = $this->getChurnData();
            $categories = $this->getCategoryPerformanceData();
            $health = $this->getPlatformHealthData();

            return [
                'transactions' => $transactions,
                'churn' => $churn,
                'categories' => $categories,
                'health' => $health,
            ];
        });
    }

    protected function getMarketplaceVelocityData(): array
    {
        $startPeriod = now()->subYears(3)->startOfYear();
        $orders = \App\Models\Order::where('created_at', '>=', $startPeriod)
            ->select('id', 'status', 'total_amount', 'created_at')
            ->get();

        // 1. Last 7 Days (7D) -> e.g., Mon, Tue
        $sevenDaysData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = now()->subDays($i);
            $dateStr = $date->format('Y-m-d');
            $dayLabel = $date->format('D');

            $dayOrders = $orders->filter(function($o) use ($dateStr) {
                return $o->created_at->format('Y-m-d') === $dateStr;
            });

            $orderCount = $dayOrders->count();
            $gmv = $dayOrders->where('status', '!=', 'cancelled')->sum('total_amount');

            $sevenDaysData[] = [
                'name' => $dayLabel,
                'orders' => (int) $orderCount,
                'gmv' => (float) $gmv,
            ];
        }

        // 2. Last 12 Months (Monthly) -> e.g., Jan, Feb
        $monthlyData = [];
        for ($i = 11; $i >= 0; $i--) {
            $date = now()->subMonths($i);
            $monthStr = $date->format('Y-m');
            $monthLabel = $date->format('M');

            $monthOrders = $orders->filter(function($o) use ($monthStr) {
                return $o->created_at->format('Y-m') === $monthStr;
            });

            $orderCount = $monthOrders->count();
            $gmv = $monthOrders->where('status', '!=', 'cancelled')->sum('total_amount');

            $monthlyData[] = [
                'name' => $monthLabel,
                'orders' => (int) $orderCount,
                'gmv' => (float) $gmv,
            ];
        }

        // 3. Last 3 Years (Yearly) -> e.g., 2024, 2025, 2026
        $yearlyData = [];
        for ($i = 2; $i >= 0; $i--) {
            $date = now()->subYears($i);
            $yearStr = $date->format('Y');
            $yearLabel = $date->format('Y');

            $yearOrders = $orders->filter(function($o) use ($yearStr) {
                return $o->created_at->format('Y') === $yearStr;
            });

            $orderCount = $yearOrders->count();
            $gmv = $yearOrders->where('status', '!=', 'cancelled')->sum('total_amount');

            $yearlyData[] = [
                'name' => $yearLabel,
                'orders' => (int) $orderCount,
                'gmv' => (float) $gmv,
            ];
        }

        // Growth rate: last 30 days vs previous 30 days
        $current30Orders = $orders->filter(fn($o) => $o->created_at >= now()->subDays(30));
        $current30Gmv = $current30Orders->where('status', '!=', 'cancelled')->sum('total_amount');

        $previous30Orders = $orders->filter(fn($o) => $o->created_at >= now()->subDays(60) && $o->created_at < now()->subDays(30));
        $previous30Gmv = $previous30Orders->where('status', '!=', 'cancelled')->sum('total_amount');

        $growthRate = 0;
        if ($previous30Gmv > 0) {
            $growthRate = round((($current30Gmv - $previous30Gmv) / $previous30Gmv) * 100, 1);
        }

        return [
            'currentGmv' => (float) $current30Gmv,
            'growthRate' => $growthRate,
            'seven_days' => $sevenDaysData,
            'monthly' => $monthlyData,
            'yearly' => $yearlyData,
        ];
    }

    protected function getChurnData(): array
    {
        $activeThreshold = now()->subDays(30);
        $atRiskThreshold = now()->subDays(60);

        $activeCount = User::where('role', 'artisan')->where('last_seen_at', '>=', $activeThreshold)->count();
        $atRiskCount = User::where('role', 'artisan')
            ->where('last_seen_at', '<', $activeThreshold)
            ->where('last_seen_at', '>=', $atRiskThreshold)
            ->count();
        $churnedCount = User::where('role', 'artisan')
            ->where(function ($q) use ($atRiskThreshold) {
                $q->where('last_seen_at', '<', $atRiskThreshold)->orWhereNull('last_seen_at');
            })
            ->count();

        $atRiskList = User::where('role', 'artisan')
            ->where(function ($q) use ($activeThreshold) {
                $q->where('last_seen_at', '<', $activeThreshold)
                  ->orWhereNull('last_seen_at');
            })
            ->orderByRaw('last_seen_at IS NULL ASC, last_seen_at DESC') // Most recently active first, then never-active
            ->limit(5)
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'shop_name' => $u->shop_name,
                'avatar' => $u->avatar,
                'premium_tier' => $u->premium_tier,
                'last_seen' => $u->last_seen_at?->diffForHumans() ?? 'Never',
                'status' => ($u->last_seen_at && $u->last_seen_at >= $atRiskThreshold) ? 'At Risk' : 'Churned',
            ]);

        return [
            'active' => $activeCount,
            'atRisk' => $atRiskCount,
            'churned' => $churnedCount,
            'atRiskList' => $atRiskList,
        ];
    }

    protected function getCategoryPerformanceData(): array
    {
        return \App\Models\Category::select('categories.*')
            ->selectSub(function ($query) {
                $query->selectRaw('COALESCE(SUM(order_items.price * order_items.quantity), 0)')
                    ->from('order_items')
                    ->join('products', 'order_items.product_id', '=', 'products.id')
                    ->join('orders', 'order_items.order_id', '=', 'orders.id')
                    ->whereColumn('products.category', 'categories.name')
                    ->where('orders.status', '!=', 'cancelled');
            }, 'gmv')
            ->orderByDesc('gmv')
            ->limit(6)
            ->get()
            ->map(fn($c) => [
                'category' => $c->name,
                'gmv' => (float) ($c->gmv ?? 0)
            ])
            ->values()
            ->toArray();
    }

    protected function getPlatformHealthData(): array
    {
        $totalOrders = \App\Models\Order::count();
        $completedOrders = \App\Models\Order::where('status', 'delivered')->count();
        $completionRate = $totalOrders > 0 ? round(($completedOrders / $totalOrders) * 100, 1) : 0;

        $aov = \App\Models\Order::where('status', '!=', 'cancelled')->avg('total_amount') ?? 0;

        $totalReviews = \App\Models\Review::count();
        $reviewRate = $totalOrders > 0 ? round(($totalReviews / $totalOrders) * 100, 1) : 0;

        $refundedOrders = \App\Models\Order::where('status', 'refunded')->count();
        $refundRate = $totalOrders > 0 ? round(($refundedOrders / $totalOrders) * 100, 1) : 0;

        return [
            'completionRate' => $completionRate,
            'aov' => round($aov, 2),
            'reviewRate' => $reviewRate,
            'refundRate' => $refundRate,
        ];
    }
}
