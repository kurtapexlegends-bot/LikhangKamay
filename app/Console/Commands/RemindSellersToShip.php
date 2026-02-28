<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class RemindSellersToShip extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orders:remind-shipping';
    protected $description = 'Remind sellers to ship orders waiting for > 3 days';

    public function handle()
    {
        $this->info('Checking for stale shipments...');

        // Find orders: Accepted, older than 3 days, reminder NOT sent
        $orders = \App\Models\Order::where('status', 'Accepted')
            ->where('shipment_reminder_sent', false)
            ->where('accepted_at', '<', now()->subDays(3))
            ->get();

        if ($orders->isEmpty()) {
            $this->info('No reminders to send.');
            return;
        }

        foreach ($orders as $order) {
            /** @var \App\Models\Order $order */
            
            // Get Artisan (Seller)
            // Note: product->artisan_id might be better, but order has artisan_id directly
            $artisan = \App\Models\User::find($order->artisan_id);

            if ($artisan && $artisan->email) {
                try {
                    \Illuminate\Support\Facades\Mail::to($artisan->email)->send(new \App\Mail\ShipmentReminder($order));
                    
                    // Mark as sent
                    $order->update(['shipment_reminder_sent' => true]);
                    
                    $this->info("Sent reminder for Order #{$order->order_number} to {$artisan->name}");
                } catch (\Exception $e) {
                    $this->error("Failed to send for Order #{$order->order_number}: " . $e->getMessage());
                }
            }
        }

        $this->info('Done.');
    }
}
