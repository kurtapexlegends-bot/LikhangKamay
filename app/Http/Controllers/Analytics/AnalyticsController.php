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

        $cacheKey = "seller_analytics_data_{$sellerId}_" . md5($categoryFilter);
        $analyticsData = \Illuminate\Support\Facades\Cache::remember($cacheKey, 300, function () use ($metricsService, $sellerId, $categoryFilter, $shopAnalyticsService) {
            return [
                'rollup' => rescue(fn () => $shopAnalyticsService->getAnalyticsRollup($sellerId), [
                    'date' => now()->toDateString(),
                    'daily' => ['sales' => 0, 'orders_count' => 0, 'completed_orders_count' => 0],
                    'all_time' => ['total_sales' => 0, 'orders_count' => 0, 'aov' => 0, 'orders_by_status' => []],
                    'low_stock_alerts' => ['count' => 0, 'threshold' => 10, 'products' => []],
                ], report: false),
                'financials' => rescue(fn () => $metricsService->getFinancialMetrics($sellerId), [
                    'current' => ['revenue' => 0, 'cost' => 0, 'profit' => 0, 'orders' => 0, 'avg' => 0, 'margin' => 0],
                    'growth' => ['revenue' => 0, 'orders' => 0, 'avg' => 0, 'profit' => 0, 'margin' => 0],
                ], report: false),
                'followerMetrics' => rescue(fn () => $metricsService->getFollowerMetrics($sellerId), [
                    'total' => 0, 'new_this_month' => 0, 'new_last_month' => 0, 'growth_rate' => 0,
                ], report: false),
                'chartData' => rescue(fn () => $metricsService->getSalesChartData($sellerId, $categoryFilter), [
                    'monthly' => [], 'yearly' => [],
                ], report: false),
                'categoryPerformance' => rescue(fn () => $metricsService->getCategoryPerformance($sellerId), collect(), report: false),
                'topProducts' => rescue(fn () => $metricsService->getTopProducts($sellerId), collect(), report: false),
                'reviewStats' => rescue(fn () => $metricsService->getReviewStats($sellerId), [
                    'total' => 0, 'average' => 0, 'growth' => 0, 'breakdown' => ['5' => 0, '4' => 0, '3' => 0, '2' => 0, '1' => 0],
                ], report: false),
                'intelligence' => rescue(fn () => $metricsService->getSalesIntelligence($sellerId), [
                    'sales_heatmap' => collect(), 'sales_velocity' => collect(), 'slow_movers' => collect(),
                ], report: false),
            ];
        });

        $rollup = $analyticsData['rollup'] ?? [
            'date' => now()->toDateString(),
            'daily' => ['sales' => 0, 'orders_count' => 0, 'completed_orders_count' => 0],
            'all_time' => ['total_sales' => 0, 'orders_count' => 0, 'aov' => 0, 'orders_by_status' => []],
            'low_stock_alerts' => ['count' => 0, 'threshold' => 10, 'products' => []],
        ];
        $financials = $analyticsData['financials'] ?? [
            'current' => ['revenue' => 0, 'cost' => 0, 'profit' => 0, 'orders' => 0, 'avg' => 0, 'margin' => 0],
            'growth' => ['revenue' => 0, 'orders' => 0, 'avg' => 0, 'profit' => 0, 'margin' => 0],
        ];
        $followerMetrics = $analyticsData['followerMetrics'] ?? [
            'total' => 0, 'new_this_month' => 0, 'new_last_month' => 0, 'growth_rate' => 0,
        ];
        $chartData = $analyticsData['chartData'] ?? ['monthly' => [], 'yearly' => []];
        $categoryPerformance = $analyticsData['categoryPerformance'] ?? collect();
        $topProducts = $analyticsData['topProducts'] ?? collect();
        $reviewStats = $analyticsData['reviewStats'] ?? [
            'total' => 0, 'average' => 0, 'growth' => 0, 'breakdown' => ['5' => 0, '4' => 0, '3' => 0, '2' => 0, '1' => 0],
        ];
        $intelligence = $analyticsData['intelligence'] ?? [
            'sales_heatmap' => collect(), 'sales_velocity' => collect(), 'slow_movers' => collect(),
        ];

        $canViewSponsorshipAnalytics = $seller->isEliteTier();
        $sponsorshipAnalytics = $canViewSponsorshipAnalytics
            ? rescue(fn() => \Illuminate\Support\Facades\Cache::remember("seller_sponsorship_analytics_{$sellerId}", 300, fn() => $sponsorshipAnalyticsService->getSellerAnalytics($sellerId)), null)
            : null;

        $canViewRevenue = $request->user()->hasStaffCapability(User::CAP_VIEW_REVENUE);

        return Inertia::render('Seller/Performance/Performance', [
            'metrics' => [
                'total_revenue' => $canViewRevenue ? $financials['current']['revenue'] : 0,
                'gross_profit' => $canViewRevenue ? $financials['current']['profit'] : 0,
                'profit_margin' => $canViewRevenue ? round($financials['current']['margin'], 1) : 0,
                'orders_count' => (int) ($financials['current']['orders'] ?? 0),
                'avg_order_value' => $canViewRevenue ? round($financials['current']['avg'] ?? 0, 2) : 0,
                'growth' => array_merge(
                    $canViewRevenue ? $financials['growth'] : [
                        'revenue' => 0,
                        'orders' => $financials['growth']['orders'],
                        'avg' => 0,
                        'profit' => 0,
                        'margin' => 0,
                    ],
                    [
                        'rating' => $reviewStats['growth'],
                        'followers' => $followerMetrics['growth_rate'],
                    ]
                ),
                'average_rating' => $reviewStats['average'],
                'review_stats' => $reviewStats,
                'follower_metrics' => $followerMetrics,
            ],
            'followerMetrics' => $followerMetrics,
            'financials_masked' => !$canViewRevenue,
            'insights' => [
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
            $request->user()->hasStaffCapability(User::CAP_VIEW_REVENUE),
            403,
            'You do not have permission to view or export financial analytics data.'
        );

        return $exportAction->execute($seller, $sponsorshipAnalyticsService, $metricsService);
    }
}
