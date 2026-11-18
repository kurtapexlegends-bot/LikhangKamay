<?php

namespace App\Console\Commands;

use App\Casts\PostgresCompatibleBoolean;
use App\Mail\ReviewReminder;
use App\Models\Order;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendReviewReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'reviews:remind';
    protected $description = 'Send review reminders to buyers 3 days after completion';

    public function handle(): int
    {
        $this->info('Checking for orders that need review reminders...');
        $deadline = hrtime(true) + 8_000_000_000;
        $sent = 0;

        Order::query()
            ->where('status', Order::STATUS_COMPLETED)
            ->where('review_reminder_sent', PostgresCompatibleBoolean::dbVal(false))
            ->where('updated_at', '<', now()->subDays(3))
            ->with('user')
            ->eachById(function (Order $order) use ($deadline, &$sent) {
                if (hrtime(true) >= $deadline) {
                    return false;
                }

                $email = $order->user?->email;
                if ($email) {
                    try {
                        Mail::to($email)->send(new ReviewReminder($order));
                        $order->update(['review_reminder_sent' => true]);
                        $sent++;
                    } catch (\Exception $e) {
                        $this->error("Failed to send for Order #{$order->order_number}: " . $e->getMessage());
                    }
                }

                return true;
            }, 25);

        $this->info("Sent {$sent} review reminder(s).");

        return self::SUCCESS;
    }
}
