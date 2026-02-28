<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class SendReviewReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reviews:remind';
    protected $description = 'Send review reminders to buyers 3 days after completion';

    public function handle()
    {
        $this->info('Checking for orders that need review reminders...');

        // Find orders: Completed, older than 3 days, reminder NOT sent
        $orders = \App\Models\Order::where('status', 'Completed')
            ->where('review_reminder_sent', false)
            ->where('updated_at', '<', now()->subDays(3))
            ->with('user')
            ->get();

        if ($orders->isEmpty()) {
            $this->info('No reminders to send.');
            return;
        }

        foreach ($orders as $order) {
            /** @var \App\Models\Order $order */
            
            // Send Email
            if ($order->user && $order->user->email) {
                try {
                    \Illuminate\Support\Facades\Mail::to($order->user->email)->send(new \App\Mail\ReviewReminder($order));
                    
                    // Mark as sent
                    $order->update(['review_reminder_sent' => true]);
                    
                    $this->info("Sent reminder for Order #{$order->order_number}");
                } catch (\Exception $e) {
                    $this->error("Failed to send for Order #{$order->order_number}: " . $e->getMessage());
                }
            }
        }

        $this->info('Done.');
    }
}
