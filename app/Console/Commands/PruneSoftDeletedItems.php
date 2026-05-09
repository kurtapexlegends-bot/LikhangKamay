<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class PruneSoftDeletedItems extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'system:prune-trash';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Permanently delete items from the Restoration Center (Trash) that are older than 30 days.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $cutoffDate = now()->subDays(30);

        $productCount = \App\Models\Product::onlyTrashed()
            ->where('deleted_at', '<=', $cutoffDate)
            ->forceDelete();

        $categoryCount = \App\Models\Category::onlyTrashed()
            ->where('deleted_at', '<=', $cutoffDate)
            ->forceDelete();

        $orderCount = \App\Models\Order::onlyTrashed()
            ->where('deleted_at', '<=', $cutoffDate)
            ->forceDelete();

        $this->info("System optimization complete:");
        $this->info("- $productCount products purged.");
        $this->info("- $categoryCount categories purged.");
        $this->info("- $orderCount orders purged.");

        return 0;
    }
}
