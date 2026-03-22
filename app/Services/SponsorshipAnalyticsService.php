<?php

namespace App\Services;

use App\Models\OrderItem;
use App\Models\Product;
use App\Models\SponsorshipEvent;
use App\Models\SponsorshipRequest;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SponsorshipAnalyticsService
{
    public function resolveActiveRequestForProduct(Product $product): ?SponsorshipRequest
    {
        if (!$product->is_sponsored || !$product->sponsored_until || !$product->sponsored_until->isFuture()) {
            return null;
        }

        return SponsorshipRequest::query()
            ->where('product_id', $product->id)
            ->where('status', 'approved')
            ->whereNotNull('approved_at')
            ->latest('approved_at')
            ->first();
    }

    public function recordEvent(Product $product, string $eventType, string $placement, ?int $viewerUserId, ?string $sessionId): void
    {
        if (!in_array($eventType, ['impression', 'click'], true)) {
            return;
        }

        if (!$this->hasSponsorshipEventsTable()) {
            return;
        }

        $activeRequest = $this->resolveActiveRequestForProduct($product);

        if (!$activeRequest) {
            return;
        }

        $sessionKey = $viewerUserId
            ? 'user:' . $viewerUserId
            : 'session:' . ($sessionId ?: 'guest');

        $eventDate = now()->toDateString();
        $eventKey = sha1(implode('|', [
            $eventType,
            $placement,
            $product->id,
            $sessionKey,
            $eventDate,
        ]));

        SponsorshipEvent::firstOrCreate(
            ['event_key' => $eventKey],
            [
                'sponsorship_request_id' => $activeRequest->id,
                'product_id' => $product->id,
                'seller_id' => $product->user_id,
                'viewer_user_id' => $viewerUserId,
                'session_id' => $sessionId,
                'placement' => $placement,
                'event_type' => $eventType,
                'event_date' => $eventDate,
                'occurred_at' => now(),
            ]
        );
    }

    /**
     * @return array<string, mixed>
     */
    public function getSellerAnalytics(int $sellerId): array
    {
        $hasEventsTable = $this->hasSponsorshipEventsTable();
        $hasSnapshotSupport = $this->hasSponsoredOrderSnapshotSupport();

        if (!$hasEventsTable || !$hasSnapshotSupport) {
            return [
                'availability' => [
                    'is_available' => false,
                    'state' => 'unavailable',
                    'message' => 'Tracking data is unavailable until the sponsorship analytics tables are installed.',
                    'has_activity' => false,
                    'has_events_table' => $hasEventsTable,
                    'has_order_snapshots' => $hasSnapshotSupport,
                ],
                'summary' => null,
                'chartData' => [
                    'daily' => [],
                    'monthly' => [],
                ],
            ];
        }

        $impressions = 0;
        $clicks = 0;
        $impressions = SponsorshipEvent::where('seller_id', $sellerId)
            ->where('event_type', 'impression')
            ->count();
        $clicks = SponsorshipEvent::where('seller_id', $sellerId)
            ->where('event_type', 'click')
            ->count();

        $sponsoredOrders = 0;
        $sponsoredRevenue = 0.0;
        $sponsoredOrderQuery = OrderItem::query()
            ->where('was_sponsored', true)
            ->whereHas('order', function ($query) use ($sellerId) {
                $query->where('artisan_id', $sellerId)
                    ->where('status', 'Completed');
            });

        $sponsoredOrders = (clone $sponsoredOrderQuery)->distinct()->count('order_id');
        $sponsoredRevenue = (float) ((clone $sponsoredOrderQuery)
            ->selectRaw('SUM(price * quantity) as revenue')
            ->value('revenue') ?? 0);

        $chartData = [
            'daily' => $this->buildDailySeries($sellerId),
            'monthly' => $this->buildMonthlySeries($sellerId),
        ];
        $hasActivity = $impressions > 0
            || $clicks > 0
            || $sponsoredOrders > 0
            || $sponsoredRevenue > 0;

        return [
            'availability' => [
                'is_available' => true,
                'state' => $hasActivity ? 'active' : 'empty',
                'message' => $hasActivity ? null : 'No sponsorship activity yet.',
                'has_activity' => $hasActivity,
                'has_events_table' => true,
                'has_order_snapshots' => true,
            ],
            'summary' => [
                'impressions' => $impressions,
                'clicks' => $clicks,
                'ctr' => $impressions > 0 ? round(($clicks / $impressions) * 100, 1) : 0,
                'sponsored_orders' => $sponsoredOrders,
                'sponsored_revenue' => $sponsoredRevenue,
            ],
            'chartData' => $chartData,
        ];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function buildDailySeries(int $sellerId): array
    {
        $startDate = Carbon::now()->subDays(6)->startOfDay();
        $dateExpr = $this->dateExpression('occurred_at');

        $eventRows = collect();
        if ($this->hasSponsorshipEventsTable()) {
            $eventRows = SponsorshipEvent::query()
                ->where('seller_id', $sellerId)
                ->where('occurred_at', '>=', $startDate)
                ->selectRaw("{$dateExpr} as period, SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) as impressions, SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks")
                ->groupByRaw($dateExpr)
                ->orderByRaw($dateExpr)
                ->get()
                ->keyBy('period');
        }

        $orderRows = collect();
        if ($this->hasSponsoredOrderSnapshotSupport()) {
            $orderRows = OrderItem::query()
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.artisan_id', $sellerId)
                ->where('orders.status', 'Completed')
                ->where('order_items.was_sponsored', true)
                ->where('orders.created_at', '>=', $startDate)
                ->selectRaw($this->dateExpression('orders.created_at') . " as period, COUNT(DISTINCT orders.id) as sponsored_orders, SUM(order_items.price * order_items.quantity) as sponsored_revenue")
                ->groupByRaw($this->dateExpression('orders.created_at'))
                ->orderByRaw($this->dateExpression('orders.created_at'))
                ->get()
                ->keyBy('period');
        }

        $rows = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::now()->subDays($i);
            $key = $date->format('Y-m-d');
            $impressions = (int) ($eventRows[$key]->impressions ?? 0);
            $clicks = (int) ($eventRows[$key]->clicks ?? 0);

            $rows[] = [
                'name' => $date->format('M j'),
                'impressions' => $impressions,
                'clicks' => $clicks,
                'ctr' => $impressions > 0 ? round(($clicks / $impressions) * 100, 1) : 0,
                'sponsored_orders' => (int) ($orderRows[$key]->sponsored_orders ?? 0),
                'sponsored_revenue' => (float) ($orderRows[$key]->sponsored_revenue ?? 0),
            ];
        }

        return $rows;
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    protected function buildMonthlySeries(int $sellerId): array
    {
        $startMonth = Carbon::now()->subMonths(5)->startOfMonth();
        $monthExpr = $this->yearMonthExpression('occurred_at');

        $eventRows = collect();
        if ($this->hasSponsorshipEventsTable()) {
            $eventRows = SponsorshipEvent::query()
                ->where('seller_id', $sellerId)
                ->where('occurred_at', '>=', $startMonth)
                ->selectRaw("{$monthExpr} as period, SUM(CASE WHEN event_type = 'impression' THEN 1 ELSE 0 END) as impressions, SUM(CASE WHEN event_type = 'click' THEN 1 ELSE 0 END) as clicks")
                ->groupByRaw($monthExpr)
                ->orderByRaw($monthExpr)
                ->get()
                ->keyBy('period');
        }

        $orderRows = collect();
        if ($this->hasSponsoredOrderSnapshotSupport()) {
            $orderRows = OrderItem::query()
                ->join('orders', 'order_items.order_id', '=', 'orders.id')
                ->where('orders.artisan_id', $sellerId)
                ->where('orders.status', 'Completed')
                ->where('order_items.was_sponsored', true)
                ->where('orders.created_at', '>=', $startMonth)
                ->selectRaw($this->yearMonthExpression('orders.created_at') . " as period, COUNT(DISTINCT orders.id) as sponsored_orders, SUM(order_items.price * order_items.quantity) as sponsored_revenue")
                ->groupByRaw($this->yearMonthExpression('orders.created_at'))
                ->orderByRaw($this->yearMonthExpression('orders.created_at'))
                ->get()
                ->keyBy('period');
        }

        $rows = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = Carbon::now()->subMonths($i);
            $key = $month->format('Y-m');
            $impressions = (int) ($eventRows[$key]->impressions ?? 0);
            $clicks = (int) ($eventRows[$key]->clicks ?? 0);

            $rows[] = [
                'name' => $month->format('M Y'),
                'impressions' => $impressions,
                'clicks' => $clicks,
                'ctr' => $impressions > 0 ? round(($clicks / $impressions) * 100, 1) : 0,
                'sponsored_orders' => (int) ($orderRows[$key]->sponsored_orders ?? 0),
                'sponsored_revenue' => (float) ($orderRows[$key]->sponsored_revenue ?? 0),
            ];
        }

        return $rows;
    }

    protected function dateExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m-%d', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM-DD')",
            default => "DATE({$column})",
        };
    }

    protected function yearMonthExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM')",
            default => "DATE_FORMAT({$column}, '%Y-%m')",
        };
    }

    private function hasSponsorshipEventsTable(): bool
    {
        return Schema::hasTable('sponsorship_events');
    }

    private function hasSponsoredOrderSnapshotSupport(): bool
    {
        return Schema::hasTable('order_items')
            && Schema::hasColumn('order_items', 'was_sponsored');
    }
}
