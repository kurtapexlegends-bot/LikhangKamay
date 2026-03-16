<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

Artisan::command('orders:auto-complete', function () {
    $count = \App\Models\Order::where('status', 'Delivered')
        ->where('warranty_expires_at', '<=', now())
        ->update(['status' => 'Completed']);
    $this->info("Completed {$count} expired warranty orders.");
})->purpose('Mark expired warranty orders as completed');

Schedule::command('orders:auto-complete')->daily();
Schedule::command('orders:cancel-unpaid')->hourly();
Schedule::command('reviews:remind')->dailyAt('10:00');
Schedule::command('orders:remind-shipping')->dailyAt('09:00');
Schedule::command('sponsorships:expire')->daily();
