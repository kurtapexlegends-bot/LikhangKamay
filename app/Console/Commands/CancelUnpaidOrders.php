<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CancelUnpaidOrders extends Command
{
    protected $signature = 'orders:cancel-unpaid';
    protected $description = 'Cancel unpaid online orders older than 24 hours';

    public function handle()
    {
        $this->info('Checking for unpaid orders...');

        // Find non-COD orders that are still pending and older than 24 hours.
        $orders = \App\Models\Order::where('status', 'Pending')
            ->where('payment_status', 'pending')
            ->where('payment_method', '!=', 'COD') // Only affects non-COD
            ->where('created_at', '<', now()->subHours(24))
            ->get();

        if ($orders->isEmpty()) {
            $this->info('No unpaid orders to cancel.');
            return;
        }

        foreach ($orders as $order) {
            /** @var \App\Models\Order $order */
            \Illuminate\Support\Facades\DB::transaction(function () use ($order) {
                // 1. Restore Stock
                foreach ($order->items as $item) {
                     $product = \App\Models\Product::find($item->product_id);
                     if ($product) {
                         $product->increment('stock', $item->quantity);
                         $product->decrement('sold', $item->quantity); // Revert sold count
                     }
                }

                // 2. Mark as Cancelled
                $order->update([
                    'status' => 'Cancelled',
                    'shipping_notes' => 'Auto-cancelled due to non-payment.'
                ]);

                // 3. Notify User (Optional - good to have)
                // Mail::to($order->user->email)->send(new OrderCancelled($order));
            });

            $this->info("Cancelled Order #{$order->order_number}");
        }

        $this->info('Done.');
    }
}
