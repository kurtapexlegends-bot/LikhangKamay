<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Str;

class UpdateSlugs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'update:slugs';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Generate slugs for products and shops that are missing them';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info('Updating Product Slugs...');
        Product::all()->each(function($p) {
            if (!$p->slug) {
                $p->slug = Str::slug($p->name . '-' . Str::random(6));
                $p->save();
                $this->line("Updated product: {$p->name}");
            }
        });

        $this->info('Updating Shop Slugs...');
        User::where('role', 'artisan')->get()->each(function($u) {
            if ($u->shop_name && !$u->shop_slug) {
                $u->shop_slug = Str::slug($u->shop_name . '-' . Str::random(6));
                $u->save();
                $this->line("Updated shop: {$u->shop_name}");
            }
        });

        $this->info('All slugs updated successfully!');
    }
}
