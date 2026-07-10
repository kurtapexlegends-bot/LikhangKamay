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
