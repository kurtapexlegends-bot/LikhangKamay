<?php

namespace App\Console\Commands;

use App\Jobs\SyncOrderDeliveryJob;
use App\Models\OrderDelivery;
use Illuminate\Console\Command;

class SyncLalamoveDeliveries extends Command
{
    protected $signature = 'orders:sync-lalamove';
    protected $description = 'Poll Lalamove deliveries in case webhooks were missed.';

    public function handle(): int
    {
        $count = 0;

        OrderDelivery::query()
            ->where('provider', OrderDelivery::PROVIDER_LALAMOVE)
            ->whereNull('auto_cancelled_at')
            ->whereNotNull('external_order_id')
            ->where('status', '!=', OrderDelivery::STATUS_COMPLETED)
            ->chunkById(25, function ($deliveries) use (&$count) {
                foreach ($deliveries as $delivery) {
                    SyncOrderDeliveryJob::dispatch($delivery);
                    $count++;
                }
            });

        $this->info("Requested reconciliation for {$count} Lalamove delivery record(s).");

        return self::SUCCESS;
    }
}
