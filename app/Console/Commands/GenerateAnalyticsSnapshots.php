<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\SellerAnalyticsSnapshot;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class GenerateAnalyticsSnapshots extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'app:generate-analytics-snapshots {--backfill : Process all historical data}';

    /**
     * The description of the console command.
     *
     * @var string
     */
    protected $description = 'Pre-calculate and store daily financial metrics snapshots for sellers';

    /**
     * Execute the console command.
     */
    public function handle(): void
    {
        $this->info('Starting analytics snapshots generation...');

        $backfill = $this->option('backfill');

        $dateExpr = $this->dateExpression('orders.created_at');

        $query = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.status', 'Completed')
            ->selectRaw("
                orders.artisan_id as seller_id,
                {$dateExpr} as date_str,
                SUM(order_items.price * order_items.quantity) as revenue,
                SUM(order_items.cost * order_items.quantity) as cost,
                COUNT(DISTINCT order_items.order_id) as orders_count
            ")
            ->groupBy('orders.artisan_id', DB::raw($dateExpr));

        if (!$backfill) {
            // For daily runs, we recalculate the last 7 days to cover updates
            $cutoff = Carbon::now()->subDays(7)->startOfDay();
            $query->where('orders.created_at', '>=', $cutoff);
            $this->info('Processing last 7 days...');
        } else {
            $this->info('Processing all historical data (backfill)...');
        }

        $results = $query->get();

        if ($results->isEmpty()) {
            $this->info('No completed orders found to aggregate.');
            return;
        }

        $count = 0;
        foreach ($results as $row) {
            if (empty($row->date_str) || is_null($row->seller_id)) {
                continue;
            }

            SellerAnalyticsSnapshot::updateOrCreate(
                [
                    'seller_id' => (int) $row->seller_id,
                    'snapshot_date' => $row->date_str,
                ],
                [
                    'revenue' => (float) $row->revenue,
                    'cost' => (float) $row->cost,
                    'orders_count' => (int) $row->orders_count,
                ]
            );
            $count++;
        }

        $this->info("Successfully generated/updated {$count} daily snapshots.");
    }

    /**
     * Helper to get database date expression format.
     */
    protected function dateExpression(string $column): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m-%d', {$column})",
            'pgsql' => "to_char({$column}, 'YYYY-MM-DD')",
            default => "DATE_FORMAT({$column}, '%Y-%m-%d')",
        };
    }
}
