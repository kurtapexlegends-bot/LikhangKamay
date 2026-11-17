<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use App\Models\ArtisanStatusLog;
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

        $artisans = User::whereIn('role', ['artisan', 'supplier'])
            ->where('artisan_status', 'pending')
            ->whereIn('id', $ids)
            ->get();

        foreach ($artisans as $artisan) {

            DB::transaction(function () use ($artisan, $adminId) {
                ArtisanStatusLog::create([
                    'user_id' => $artisan->id,
                    'previous_status' => $artisan->artisan_status,
                    'new_status' => 'approved',
                ]);

                $trialDays = (int) \App\Facades\Settings::get('subscription_trial_days', 14);
                $approvalData = [
                    'artisan_status' => 'approved',
                    'approved_at' => now(),
                    'approved_by' => $adminId,
                    'setup_completed_at' => $artisan->setup_completed_at ?? now(),
                ];

                // Grant introductory trial of paid features on new artisan account approval
                if ($artisan->isArtisan() && $trialDays > 0 && !$artisan->has_used_trial && $artisan->subscription_expires_at === null) {
                    $approvalData['premium_tier'] = 'free';
                    $approvalData['subscription_expires_at'] = now()->addDays($trialDays);
                    $approvalData['trial_ends_at'] = now()->addDays($trialDays);
                    $approvalData['has_used_trial'] = true;
                    $approvalData['pending_downgrade_tier'] = null;
                }

                $artisan->update($approvalData);

                if (method_exists($artisan, 'resolveActiveRevisions')) {
                    $artisan->resolveActiveRevisions();
                }
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
