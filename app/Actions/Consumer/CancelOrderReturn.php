<?php

namespace App\Actions\Consumer;

use App\Models\Order;
use App\Models\User;
use App\Services\OrderFinanceService;
use Illuminate\Support\Facades\DB;

class CancelOrderReturn
{
    private $orderFinanceService;

    public function __construct(OrderFinanceService $orderFinanceService)
    {
        $this->orderFinanceService = $orderFinanceService;
    }

    /**
     * Cancel buyer return request and mark order as Completed
     *
     * @param string $id
     * @param User $buyer
     * @return void
     */
    public function execute(string $id, User $buyer): void
    {
        DB::transaction(function () use ($id, $buyer) {
            $order = Order::lockForUpdate()->where('id', $id)
                ->where('user_id', $buyer->id)
                ->where('status', 'Refund/Return')
                ->firstOrFail();

            $order->update([
                'status' => 'Completed',
            ]);
            $order->refresh();
            $this->orderFinanceService->settleCompletedOrder($order);
        });
    }
}
