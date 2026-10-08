<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use App\Mail\ArtisanApproved;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Gate;

class BulkApproveArtisans
{
    /**
     * Bulk approve pending artisans.
     *
     * @param array $ids
     * @param int $adminId
     * @return int Count of successfully approved artisans
     */
    public function execute(array $ids, int $adminId): int
    {
        Gate::authorize('admin-action');

        $count = 0;

        $artisans = User::where('role', 'artisan')
            ->where('artisan_status', 'pending')
            ->whereIn('id', $ids)
            ->get();

        foreach ($artisans as $artisan) {

            DB::transaction(function () use ($artisan, $adminId) {
                $artisan->update([
                    'artisan_status' => 'approved',
                    'approved_at' => now(),
                    'approved_by' => $adminId,
                ]);
            });

            $count++;

            if ($artisan->email) {
                try {
                    $mailer = Mail::to($artisan->email);
                    if (app()->environment('production') && config('queue.default') !== 'sync') {
                        $mailer->queue(new ArtisanApproved($artisan));
                    } else {
                        $mailer->send(new ArtisanApproved($artisan));
                    }
                } catch (\Throwable $e) {
                    report($e);
                    Log::error('Bulk Email failed: ' . $e->getMessage());
                }
            }
        }

        return $count;
    }
}
