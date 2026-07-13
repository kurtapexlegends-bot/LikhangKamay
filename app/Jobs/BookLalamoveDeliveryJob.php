<?php

namespace App\Jobs;

use Illuminate\Contracts\Queue\ShouldQueue;

use App\Models\Order;
use App\Models\User;
use App\Services\OrderLogisticsService;
use Illuminate\Bus\Queueable;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class BookLalamoveDeliveryJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $order;
    protected $seller;

    /**
     * Create a new job instance.
     */
    public function __construct(Order $order, User $seller)
    {
        $this->order = $order;
        $this->seller = $seller;
    }

    /**
     * Execute the job.
     */
    public function handle(OrderLogisticsService $orderLogisticsService): void
    {
        try {
            $orderLogisticsService->bookLalamoveDelivery($this->order, $this->seller);
        } catch (\Throwable $e) {
            Log::error('Failed to book Lalamove delivery in background job', [
                'order_id' => $this->order->id,
                'order_number' => $this->order->order_number,
                'error' => $e->getMessage(),
            ]);
            throw $e;
        }
    }
}
