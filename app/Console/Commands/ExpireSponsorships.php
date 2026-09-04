<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ExpireSponsorships extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'sponsorships:expire';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Expire sponsorships that have passed their sponsored_until date';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $expiredProducts = \App\Models\Product::where('is_sponsored', true)
            ->whereNotNull('sponsored_until')
            ->where('sponsored_until', '<', now())
            ->get(['id']);

        $productIds = $expiredProducts->pluck('id')->all();

        $expiredCount = 0;
        if (!empty($productIds)) {
            $expiredCount = \App\Models\Product::whereIn('id', $productIds)
                ->update(['is_sponsored' => false]);

            \App\Models\SponsorshipRequest::whereIn('product_id', $productIds)
                ->where('status', 'approved')
                ->update(['status' => 'expired']);
        }
            
        $this->info("Expired {$expiredCount} sponsorships.");
    }
}
