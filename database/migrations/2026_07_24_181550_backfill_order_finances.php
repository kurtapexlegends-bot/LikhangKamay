<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $orders = \App\Models\Order::where('seller_net_amount', 0.00)->get();
        $financeService = new \App\Services\OrderFinanceService();

        foreach ($orders as $order) {
            $finance = $financeService->calculateAmounts(
                (float) $order->merchandise_subtotal,
                $order->shipping_method ?? 'Delivery',
                (float) $order->shipping_fee_amount
            );

            $order->update([
                'convenience_fee_amount' => $finance['convenience_fee_amount'],
                'shipping_fee_amount' => $finance['shipping_fee_amount'],
                'platform_commission_amount' => $finance['platform_commission_amount'],
                'seller_net_amount' => $finance['seller_net_amount'],
                'total_amount' => $finance['total_amount'],
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // No-op
    }
};
