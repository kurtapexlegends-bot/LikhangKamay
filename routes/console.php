<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use App\Services\StaffAttendanceService;

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

Artisan::command('staff:auto-pause-inactive', function () {
    $count = app(StaffAttendanceService::class)->autoPauseInactiveSessions();

    $this->info("Auto-paused {$count} inactive staff attendance session(s).");
})->purpose('Pause stale staff attendance sessions after inactivity');

Artisan::command('announcements:expire', function () {
    $count = \App\Models\SystemAnnouncement::where('is_active', true)
        ->whereNotNull('expires_at')
        ->where('expires_at', '<=', now())
        ->update(['is_active' => false]);
    $this->info("Expired {$count} announcement(s).");
})->purpose('Auto-deactivate announcements past their expiry time');

Schedule::command('orders:auto-complete')->daily();
Schedule::command('staff:auto-pause-inactive')->everyMinute();
Schedule::command('orders:cancel-unpaid')->hourly();
Schedule::command('announcements:expire')->everyMinute();
Schedule::command('reviews:remind')->dailyAt('10:00');
Schedule::command('orders:remind-shipping')->dailyAt('09:00');
Schedule::command('orders:sync-lalamove')->everyFifteenMinutes();
Schedule::command('orders:auto-cancel-failed-deliveries')->everyFifteenMinutes();
Schedule::command('sponsorships:expire')->daily();
Schedule::command('paymongo:verify')->everyFiveMinutes();
Schedule::command('system:prune-trash')->daily();

Artisan::command('notifications:showcase', function () {
    // Find the user ID from the active session
    $session = \DB::table('sessions')->whereNotNull('user_id')->orderBy('last_activity', 'desc')->first();
    $userId = $session ? $session->user_id : \App\Models\User::where('role', 'artisan')->latest()->value('id');
    
    $user = \App\Models\User::find($userId);
    
    if (!$user) {
        $this->error('No active user found to send notifications to.');
        return;
    }

    $order = \App\Models\Order::where('artisan_id', $user->id)->latest()->first() ?? \App\Models\Order::latest()->first();
    $supply = \App\Models\Supply::where('user_id', $user->id)->first() ?? \App\Models\Supply::latest()->first();

    if (!$order) {
        $this->error('No orders found to use for sample notifications.');
        return;
    }

    // Fire the new notifications
    $user->notify(new \App\Notifications\PaymentConfirmedNotification($order));
    $user->notify(new \App\Notifications\RefundRequestNotification($order));
    $user->notify(new \App\Notifications\ShipmentDeadlineNotification($order, 12));
    if ($supply) {
        $user->notify(new \App\Notifications\SupplyDepletedNotification($supply));
    }

    $this->info("Success! 4 operational notifications sent to {$user->name} (User ID: {$user->id}). Check your notification bell now.");
})->purpose('Showcase the new strategic notifications');
