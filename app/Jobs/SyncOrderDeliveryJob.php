<?php

namespace App\Jobs;

use App\Models\OrderDelivery;
use App\Services\Logistics\LalamoveWebhookService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncOrderDeliveryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /**
     * The number of times the job may be attempted.
     *
     * @var int
     */
    public int $tries = 3;

    /**
     * The number of seconds the job can run before timing out.
     *
     * @var int
     */
    public int $timeout = 60;

    /**
     * The number of seconds to wait before retrying the job.
     *
     * @var int
     */
    public int $backoff = 10;

    protected $delivery;

    public function __construct(OrderDelivery $delivery)
    {
        $this->delivery = $delivery;
    }

    public function handle(LalamoveWebhookService $lalamoveWebhookService): void
    {
        try {
            $lalamoveWebhookService->syncDelivery($this->delivery);
        } catch (\Throwable $e) {
            Log::error('Failed to sync delivery in background job', [
                'delivery_id' => $this->delivery->id,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
