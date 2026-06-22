<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use App\Models\ArtisanStatusLog;
use App\Models\PlatformActivity;
use App\Mail\ArtisanRejected;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Gate;

class RejectArtisan
{
    /**
     * Reject artisan application.
     *
     * @param int|string $id
     * @param string $reason
     * @return void
     */
    public function execute(int|string $id, string $reason): void
    {
        Gate::authorize('admin-action');

        $artisan = User::where('role', 'artisan')->where('artisan_status', 'pending')->findOrFail($id);

        DB::transaction(function () use ($artisan, $reason) {
            ArtisanStatusLog::create([
                'user_id' => $artisan->id,
                'previous_status' => $artisan->artisan_status,
                'new_status' => 'rejected',
            ]);

            $artisan->update([
                'artisan_status' => 'rejected',
                'artisan_rejection_reason' => $reason,
            ]);
        });

        session()->forget("artisan_review_docs_{$id}");

        // Log Activity
        PlatformActivity::log(
            'artisan_rejected',
            "Rejected artisan application for: {$artisan->name}",
            ['artisan_id' => $artisan->id, 'reason' => $reason]
        );

        try {
            if ($artisan->email) {
                Mail::to($artisan->email)->send(new ArtisanRejected($artisan));
            }
        } catch (\Exception $e) {
            Log::error('Email failed: ' . $e->getMessage());
        }
    }
}
