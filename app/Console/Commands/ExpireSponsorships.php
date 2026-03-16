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
        $expiredCount = \App\Models\Product::where('is_sponsored', true)
            ->whereNotNull('sponsored_until')
            ->where('sponsored_until', '<', now())
            ->update(['is_sponsored' => false]);
            
        $this->info("Expired {$expiredCount} sponsorships.");
    }
}
