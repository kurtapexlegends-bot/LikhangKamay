<?php

namespace App\Http\Controllers\Analytics;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Services\SponsorshipAnalyticsService;
use App\Services\ShopAnalyticsService;
use App\Services\Analytics\ShopAnalyticsMetricsService;
use App\Actions\Seller\Analytics\ExportAnalyticsReportCsv;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AnalyticsController extends Controller
{
    use InteractsWithSellerContext;

    public function index(
        Request $request,
        SponsorshipAnalyticsService $sponsorshipAnalyticsService,
        ShopAnalyticsService $shopAnalyticsService,
        ShopAnalyticsMetricsService $metricsService
    ) {
        $seller = $this->sellerOwner();
        $sellerId = $seller->id;
        $filter = $request->input('filter', 'monthly');
        $categoryFilter = $request->input('category', 'All Categories');

        $rollup = $shopAnalyticsService->getAnalyticsRollup($sellerId);

        $financials = $metricsService->getFinancialMetrics($sellerId);
        $customerInsights = $metricsService->getCustomerInsights($sellerId);
        $chartData = $metricsService->getSalesChartData($sellerId, $categoryFilter);
        $categoryPerformance = $metricsService->getCategoryPerformance($sellerId);
        $topProducts = $metricsService->getTopProducts($sellerId);
        $reviewStats = $metricsService->getReviewStats($sellerId);
        $intelligence = $metricsService->getSalesIntelligence($sellerId);

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
            'categories' => $metricsService->getCategoryList($sellerId),
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

    public function export(
        Request $request,
        SponsorshipAnalyticsService $sponsorshipAnalyticsService,
        ShopAnalyticsMetricsService $metricsService,
        ExportAnalyticsReportCsv $exportAction
    ) {
        $seller = $this->sellerOwner();

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

        return $exportAction->execute($seller, $sponsorshipAnalyticsService, $metricsService);
    }
}
