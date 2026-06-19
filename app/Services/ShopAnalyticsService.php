<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Product;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class ShopAnalyticsService
{
    /**
     * Retrieve the cached daily rollup metrics for a given seller and date.
     *
     * @param int $sellerId
     * @param string|null $date
     * @param int $stockThreshold
     * @return array<string, mixed>
     */
    public function getAnalyticsRollup(int $sellerId, ?string $date = null, int $stockThreshold = 5): array
    {
        $today = Carbon::now(config('app.timezone'))->toDateString();
        $targetDate = $date ?: $today;

        $cacheKey = "seller_{$sellerId}_analytics_daily_rollup_{$targetDate}";
        
        // Past dates are static and cached for 30 days. Today is cached for 24 hours but evicted on events.
        $ttl = ($targetDate === $today) ? 86400 : 2592000;

        return Cache::remember($cacheKey, $ttl, function () use ($sellerId, $targetDate, $stockThreshold) {
            return [
                'date' => $targetDate,
                'daily' => $this->calculateDailySnapshot($sellerId, $targetDate),
                'all_time' => $this->calculateAllTimeSummary($sellerId),
                'fulfillment_latency' => $this->calculateFulfillmentLatency($sellerId),
                'low_stock_alerts' => $this->calculateLowStockAlerts($sellerId, $stockThreshold),
                'generated_at' => Carbon::now(config('app.timezone'))->toIso8601String(),
            ];
        });
    }

    /**
     * Clear the analytics rollup cache key for a given seller and date.
     *
     * @param int $sellerId
     * @param string|null $date
     * @return void
     */
    public function clearCache(int $sellerId, ?string $date = null): void
    {
        $targetDate = $date ?: Carbon::now(config('app.timezone'))->toDateString();
        Cache::forget("seller_{$sellerId}_analytics_daily_rollup_{$targetDate}");
    }

    /**
     * Calculate sales and order metrics for the target date.
     *
     * @param int $sellerId
     * @param string $date
     * @return array<string, float|int>
     */
    private function calculateDailySnapshot(int $sellerId, string $date): array
    {
        $dailyOrders = Order::query()
            ->where('artisan_id', $sellerId)
            ->whereDate('created_at', $date)
            ->get();

        $completedSales = (float) $dailyOrders->where('status', 'Completed')->sum(function (Order $order) {
            return $order->getResolvedSellerNetAmount();
        });

        return [
            'sales' => round($completedSales, 2),
            'orders_count' => $dailyOrders->count(),
            'completed_orders_count' => $dailyOrders->where('status', 'Completed')->count(),
        ];
    }

    /**
     * Calculate all-time aggregate metrics and AOV for completed orders.
     *
     * @param int $sellerId
     * @return array<string, mixed>
     */
    private function calculateAllTimeSummary(int $sellerId): array
    {
        $orders = Order::query()
            ->where('artisan_id', $sellerId)
            ->get();

        $completedOrders = $orders->where('status', 'Completed');
        
        $totalSales = (float) $completedOrders->sum(function (Order $order) {
            return $order->getResolvedSellerNetAmount();
        });

        $completedCount = $completedOrders->count();
        $aov = $completedCount > 0 ? ($totalSales / $completedCount) : 0.0;

        $statusBreakdown = [
            'Pending' => 0,
            'Processing' => 0,
            'Shipped' => 0,
            'Completed' => 0,
            'Cancelled' => 0,
        ];

        foreach ($orders as $order) {
            $status = $order->status;
            if (array_key_exists($status, $statusBreakdown)) {
                $statusBreakdown[$status]++;
            }
        }

        return [
            'total_sales' => round($totalSales, 2),
            'orders_count' => $completedCount,
            'aov' => round($aov, 2),
            'orders_by_status' => $statusBreakdown,
        ];
    }

    /**
     * Calculate average fulfillment latency metrics in hours in a database-agnostic manner.
     *
     * @param int $sellerId
     * @return array<string, float>
     */
    private function calculateFulfillmentLatency(int $sellerId): array
    {
        $orders = Order::query()
            ->where('artisan_id', $sellerId)
            ->select(['created_at', 'accepted_at', 'shipped_at', 'delivered_at'])
            ->get();

        $acceptanceSum = 0;
        $acceptanceCount = 0;
        $fulfillmentSum = 0;
        $fulfillmentCount = 0;
        $deliverySum = 0;
        $deliveryCount = 0;

        foreach ($orders as $order) {
            $createdRaw = $order->getRawOriginal('created_at') ?: $order->created_at;
            $acceptedRaw = $order->getRawOriginal('accepted_at') ?: $order->accepted_at;
            $shippedRaw = $order->getRawOriginal('shipped_at') ?: $order->shipped_at;
            $deliveredRaw = $order->getRawOriginal('delivered_at') ?: $order->delivered_at;

            if ($createdRaw && $acceptedRaw) {
                $created = Carbon::parse($createdRaw);
                $accepted = Carbon::parse($acceptedRaw);
                $acceptanceSum += $created->diffInMinutes($accepted) / 60.0;
                $acceptanceCount++;
            }

            if ($acceptedRaw && $shippedRaw) {
                $accepted = Carbon::parse($acceptedRaw);
                $shipped = Carbon::parse($shippedRaw);
                $fulfillmentSum += $accepted->diffInMinutes($shipped) / 60.0;
                $fulfillmentCount++;
            }

            if ($shippedRaw && $deliveredRaw) {
                $shipped = Carbon::parse($shippedRaw);
                $delivered = Carbon::parse($deliveredRaw);
                $deliverySum += $shipped->diffInMinutes($delivered) / 60.0;
                $deliveryCount++;
            }
        }

        return [
            'avg_acceptance_hours' => $acceptanceCount > 0 ? round($acceptanceSum / $acceptanceCount, 1) : 0.0,
            'avg_fulfillment_hours' => $fulfillmentCount > 0 ? round($fulfillmentSum / $fulfillmentCount, 1) : 0.0,
            'avg_delivery_hours' => $deliveryCount > 0 ? round($deliverySum / $deliveryCount, 1) : 0.0,
        ];
    }

    /**
     * Retrieve active products where stock is below the threshold.
     *
     * @param int $sellerId
     * @param int $threshold
     * @return array<string, mixed>
     */
    private function calculateLowStockAlerts(int $sellerId, int $threshold): array
    {
        $lowStockProducts = Product::query()
            ->where('user_id', $sellerId)
            ->where('status', 'Active')
            ->where('stock', '<=', $threshold)
            ->select(['id', 'sku', 'name', 'stock', 'price'])
            ->get();

        return [
            'count' => $lowStockProducts->count(),
            'threshold' => $threshold,
            'products' => $lowStockProducts->map(fn (Product $p) => [
                'id' => $p->id,
                'sku' => $p->sku,
                'name' => $p->name,
                'stock' => $p->stock,
                'price' => round((float) $p->price, 2),
            ])->toArray(),
        ];
    }
}
