<?php

namespace App\Actions\Seller\Analytics;

use App\Models\OrderItem;
use App\Models\User;
use App\Services\SponsorshipAnalyticsService;
use App\Services\Analytics\ShopAnalyticsMetricsService;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportAnalyticsReportCsv
{
    /**
     * Execute CSV analytics report export.
     *
     * @param User $seller
     * @param SponsorshipAnalyticsService $sponsorshipAnalyticsService
     * @param ShopAnalyticsMetricsService $metricsService
     * @return StreamedResponse
     */
    public function execute(
        User $seller,
        SponsorshipAnalyticsService $sponsorshipAnalyticsService,
        ShopAnalyticsMetricsService $metricsService
    ): StreamedResponse {
        $sellerId = $seller->id;
        $filename = 'analytics_report_' . date('Y-m-d_H-i-s') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $yearMonthExpr = $metricsService->yearMonthExpression('orders.created_at');

        $revenueData = OrderItem::whereHas('order', function ($query) use ($sellerId) {
            $query->where('artisan_id', $sellerId)
                ->where('status', 'Completed')
                ->where('created_at', '>=', Carbon::now()->subMonths(12));
        })
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->selectRaw("{$yearMonthExpr} as month, SUM(order_items.price * order_items.quantity) as revenue, SUM(order_items.cost * order_items.quantity) as cost, COUNT(DISTINCT orders.id) as order_count")
            ->groupByRaw($yearMonthExpr)
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
