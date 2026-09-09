<?php

namespace App\Console\Commands;

use App\Actions\Seller\Subscription\ProcessSubscriptionLifecycle;
use Illuminate\Console\Command;

class ProcessSubscriptionLifecycleCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'subscriptions:process-lifecycle';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process subscription lifecycle events, period expirations, and graceful downgrades.';

    /**
     * Execute the console command.
     */
    public function handle(ProcessSubscriptionLifecycle $action): int
    {
        $this->info('Processing subscription lifecycle and expirations...');

        $result = $action->execute();

        $this->info("Completed: {$result['downgraded_count']} expired subscription(s) gracefully transitioned, {$result['failed_transactions_count']} stale checkout transaction(s) marked failed.");

        return Command::SUCCESS;
    }
}
