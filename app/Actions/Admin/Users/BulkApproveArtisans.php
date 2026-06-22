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

        foreach ($ids as $id) {
            $artisan = User::where('role', 'artisan')->where('artisan_status', 'pending')->find($id);
            if (!$artisan) {
                continue;
            }

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
                    Mail::to($artisan->email)->send(new ArtisanApproved($artisan));
                } catch (\Exception $e) {
                    Log::error('Bulk Email failed: ' . $e->getMessage());
                }
            }
        }

        return $count;
    }
}
