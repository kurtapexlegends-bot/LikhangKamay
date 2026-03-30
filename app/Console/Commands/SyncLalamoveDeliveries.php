<?php

namespace App\Console\Commands;

use App\Models\OrderDelivery;
use App\Services\OrderLogisticsService;
use Illuminate\Console\Command;

class SyncLalamoveDeliveries extends Command
{
    protected $signature = 'orders:sync-lalamove';
    protected $description = 'Poll Lalamove deliveries in case webhooks were missed.';

    public function handle(OrderLogisticsService $orderLogisticsService): int
    {
        $count = 0;

        OrderDelivery::query()
            ->where('provider', OrderDelivery::PROVIDER_LALAMOVE)
            ->whereNull('auto_cancelled_at')
            ->whereNotNull('external_order_id')
            ->whereNotIn('status', [OrderDelivery::STATUS_COMPLETED])
            ->get()
            ->each(function (OrderDelivery $delivery) use ($orderLogisticsService, &$count) {
                try {
                    $orderLogisticsService->syncDelivery($delivery);
                    $count++;
                } catch (\Throwable $e) {
                    report($e);
                    $this->error("Failed to sync delivery {$delivery->id}: {$e->getMessage()}");
                }
            });

        $this->info("Synced {$count} Lalamove delivery record(s).");

        return self::SUCCESS;
    }
}
