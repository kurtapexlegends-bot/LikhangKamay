<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\OrderItem;

class FixOrderImages extends Command
{
    protected $signature = 'fix:order-images';
    protected $description = 'Fix absolute URLs in order items images';

    public function handle()
    {
        $items = OrderItem::where('product_img', 'LIKE', '%http%')->get();
        $this->info("Found " . $items->count() . " items to fix.");

        foreach ($items as $item) {
            /** @var OrderItem $item */
            // matches 'products/...' or 'avatars/...' etc.
            if (preg_match('/(products\/.*)$/', $item->product_img, $matches)) {
                $item->update(['product_img' => $matches[1]]);
                $this->info("Fixed Item ID: {$item->id}");
            } else {
                $this->warn("Could not parse image path for Item ID: {$item->id} - {$item->product_img}");
            }
        }
        
        $this->info("Done.");
    }
}
