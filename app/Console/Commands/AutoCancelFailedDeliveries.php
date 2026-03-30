<?php

namespace App\Console\Commands;

use App\Models\OrderDelivery;
use App\Services\OrderLogisticsService;
use Illuminate\Console\Command;

class AutoCancelFailedDeliveries extends Command
{
    protected $signature = 'orders:auto-cancel-failed-deliveries';
    protected $description = 'Auto-cancel unresolved terminally failed courier deliveries after the hold window.';

    public function handle(OrderLogisticsService $orderLogisticsService): int
    {
        $count = 0;

        OrderDelivery::query()
            ->where('provider', OrderDelivery::PROVIDER_LALAMOVE)
            ->whereNull('auto_cancelled_at')
            ->whereNotNull('terminal_failed_at')
            ->where('terminal_failed_at', '<=', now()->subDay())
            ->get()
            ->each(function (OrderDelivery $delivery) use ($orderLogisticsService, &$count) {
                try {
                    if ($orderLogisticsService->autoCancelFailedDelivery($delivery)) {
                        $count++;
                    }
                } catch (\Throwable $e) {
                    report($e);
                    $this->error("Failed to auto-cancel delivery {$delivery->id}: {$e->getMessage()}");
                }
            });

        $this->info("Auto-cancelled {$count} failed delivery order(s).");

        return self::SUCCESS;
    }
}
