<?php

namespace App\Services\Admin;

use App\Models\User;
use App\Models\ReviewDispute;
use App\Models\SponsorshipRequest;
use Illuminate\Support\Facades\Cache;

class AdminAnalyticsService
{
    public function getSLAMetrics(): array
    {
        return Cache::remember('admin_sla_metrics', 300, function () {
            $window = now()->subDays(30);

            // 1. Artisan Approval SLA (Goal: 24h)
            $avgApprovalTime = User::where('role', 'artisan')
                ->where('approved_at', '>=', $window)
                ->whereNotNull('setup_completed_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, setup_completed_at, approved_at)) as avg_hours')
                ->value('avg_hours') ?? 0;

            // 2. Dispute Resolution SLA (Goal: 48h)
            $avgDisputeTime = ReviewDispute::where('status', 'resolved')
                ->where('resolved_at', '>=', $window)
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours')
                ->value('avg_hours') ?? 0;

            // 3. Sponsorship SLA (Goal: 24h)
            $avgSponsorshipTime = SponsorshipRequest::where('status', 'approved')
                ->where('approved_at', '>=', $window)
                ->whereNotNull('requested_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, requested_at, approved_at)) as avg_hours')
                ->value('avg_hours') ?? 0;

            return [
                'avgArtisanApprovalHours' => round($avgApprovalTime, 1),
                'avgDisputeResolutionHours' => round($avgDisputeTime, 1),
                'avgSponsorshipApprovalHours' => round($avgSponsorshipTime, 1),
                'artisanSLACompliance' => $avgApprovalTime == 0 ? 100 : ($avgApprovalTime <= 24 ? 100 : max(0, round(100 - (($avgApprovalTime - 24) * 2), 1))),
                'disputeSLACompliance' => $avgDisputeTime == 0 ? 100 : ($avgDisputeTime <= 48 ? 100 : max(0, round(100 - (($avgDisputeTime - 48) * 1.5), 1))),
                'sponsorshipSLACompliance' => $avgSponsorshipTime == 0 ? 100 : ($avgSponsorshipTime <= 24 ? 100 : max(0, round(100 - (($avgSponsorshipTime - 24) * 2), 1))),
            ];
        });
    }

    public function getInsightsData(): array
    {
        return Cache::remember('admin_insights_data', 3600, function () {
            $revenue = $this->getRevenueForecastData();
            $churn = $this->getChurnData();
            $categories = $this->getCategoryPerformanceData();
            $health = $this->getPlatformHealthData();

            return [
                'revenue' => $revenue,
                'churn' => $churn,
                'categories' => $categories,
                'health' => $health,
            ];
        });
    }

    protected function getRevenueForecastData(): array
    {
        $premiumPrice = (float) \App\Facades\Settings::get('tier_premium_price', 199.00);
        $elitePrice = (float) \App\Facades\Settings::get('tier_super_premium_price', 399.00);

        $months = collect(range(11, 0))->map(fn($i) => now()->subMonths($i)->endOfMonth());
        $snapshots = app(\App\Services\Admin\AdminMetricsService::class)->getHistoricalTierSnapshots($months->toArray());

        $history = [];
        foreach ($snapshots as $monthLabel => $counts) {
            $history[] = [
                'month' => $monthLabel,
                'mrr' => ($counts['premium'] * $premiumPrice) + ($counts['super_premium'] * $elitePrice),
            ];
        }

        $currentMRR = end($history)['mrr'] ?? 0;
        $previousMRR = count($history) > 1 ? $history[count($history) - 2]['mrr'] : 0;

        $growthRate = 0;
        if ($previousMRR > 0) {
            $growthRate = round((($currentMRR - $previousMRR) / $previousMRR) * 100, 1);
        }

        $forecastedMRR = round($currentMRR * (1 + ($growthRate / 100)));

        return [
            'currentMRR' => number_format($currentMRR),
            'forecastedMRR' => number_format($forecastedMRR),
            'growthRate' => $growthRate,
            'history' => $history,
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
        return \App\Models\Category::withCount(['products as gmv' => function ($query) {
            $query->join('order_items', 'products.id', '=', 'order_items.product_id')
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.status', '!=', 'cancelled')
                ->select(\Illuminate\Support\Facades\DB::raw('SUM(order_items.price * order_items.quantity)'));
        }])
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
