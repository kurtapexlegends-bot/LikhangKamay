<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use App\Models\ArtisanStatusLog;
use App\Models\PlatformActivity;
use App\Mail\ArtisanRejected;
use App\Support\RevisionSchemaRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Gate;

class RejectArtisan
{
    /**
     * Reject artisan application with targeted revision checklist items and feedback.
     *
     * @param int|string $id
     * @param string $reason
     * @param array $revisionItems
     * @return void
     */
    public function execute(int|string $id, string $reason, array $revisionItems = []): void
    {
        Gate::authorize('admin-action');

        $artisan = User::where('role', 'artisan')->where('artisan_status', 'pending')->findOrFail($id);

        $normalizedItems = RevisionSchemaRegistry::normalizeItems('artisan_kyc', $revisionItems);
        $formattedReason = RevisionSchemaRegistry::formatSummaryString($normalizedItems, $reason);
        $effectiveReason = $formattedReason !== '' ? $formattedReason : trim(strip_tags($reason));

        DB::transaction(function () use ($artisan, $effectiveReason, $reason, $normalizedItems) {
            ArtisanStatusLog::create([
                'user_id' => $artisan->id,
                'previous_status' => $artisan->artisan_status,
                'new_status' => 'rejected',
            ]);

            $artisan->update([
                'artisan_status' => 'rejected',
                'artisan_rejection_reason' => $effectiveReason,
            ]);

            $artisan->recordRevision('artisan_kyc', $normalizedItems, $reason, auth()->id());
        });

        session()->forget("artisan_review_docs_{$id}");

        // Log Standardized Audit Activity
        app(\App\Actions\Audit\RecordAuditActivity::class)->execute(
            action: 'artisan.rejected',
            description: "Requested application revision for: {$artisan->name}",
            subject: $artisan,
            diff: [
                'artisan_id' => $artisan->id,
                'shop_name' => $artisan->shop_name,
                'before' => ['artisan_status' => 'pending'],
                'after' => [
                    'artisan_status' => 'rejected',
                    'reason' => $effectiveReason,
                    'flagged_keys' => array_column($normalizedItems, 'key'),
                ],
            ],
            actorId: auth()->id(),
        );

        try {
            if ($artisan->email) {
                $mailer = Mail::to($artisan->email);
                if (app()->environment('production') && config('queue.default') !== 'sync') {
                    $mailer->queue(new ArtisanRejected($artisan));
                } else {
                    $mailer->send(new ArtisanRejected($artisan));
                }
            }
        } catch (\Throwable $e) {
            report($e);
            Log::error('Email failed: ' . $e->getMessage());
        }
    }
}
