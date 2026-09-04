<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Services\StaffAttendanceService;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;

Artisan::command('orders:auto-complete', function () {
    $orders = \App\Models\Order::with('user')
        ->where('status', 'Delivered')
        ->where(function ($q) {
            $q->where(function ($sq) {
                $sq->whereNotNull('auto_complete_at')
                   ->where('auto_complete_at', '<=', now());
            })->orWhere(function ($sq) {
                $sq->whereNull('auto_complete_at')
                   ->whereNotNull('warranty_expires_at')
                   ->where('warranty_expires_at', '<=', now());
            });
        })
        ->get();

    $count = 0;
    foreach ($orders as $order) {
        $user = $order->user ?? \App\Models\User::withTrashed()->find($order->user_id);
        if (!$user) {
            $order->update([
                'status' => 'Completed',
                'received_at' => now(),
                'warranty_expires_at' => now()->addDay(),
                'payment_status' => $order->payment_method === 'COD' ? 'paid' : $order->payment_status,
            ]);
            $count++;
            continue;
        }

        try {
            app(\App\Actions\Consumer\ReceiveOrder::class)->execute((string) $order->id, $user);
            $count++;
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Failed to auto-complete order #{$order->order_number}: " . $e->getMessage());
        }
    }

    $this->info("Completed {$count} expired warranty orders.");
})->purpose('Mark expired warranty orders as completed');

Artisan::command('staff:auto-pause-inactive', function () {
    $count = app(StaffAttendanceService::class)->autoPauseInactiveSessions();

    $this->info("Auto-paused {$count} inactive staff attendance session(s).");
})->purpose('Pause stale staff attendance sessions after inactivity');

Schedule::command('orders:auto-complete')->daily();
Schedule::command('staff:auto-pause-inactive')->everyMinute();
Schedule::command('orders:cancel-unpaid')->hourly();
Schedule::command('reviews:remind')->dailyAt('10:00');
Schedule::command('orders:remind-shipping')->dailyAt('09:00');
Schedule::command('orders:sync-lalamove')->everyFifteenMinutes();
Schedule::command('orders:auto-cancel-failed-deliveries')->everyFifteenMinutes();
Schedule::command('sponsorships:expire')->daily();
Schedule::command('paymongo:verify')->everyFiveMinutes();
Schedule::command('system:prune-trash')->daily();
