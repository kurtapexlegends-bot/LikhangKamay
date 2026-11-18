<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use App\Models\ArtisanStatusLog;
use App\Models\PlatformActivity;
use App\Support\ArtisanDocumentReviews;
use App\Mail\ArtisanApproved;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Gate;

class ApproveArtisan
{
    /**
     * Approve artisan application.
     *
     * @param int|string $id
     * @param int $adminId
     * @return void
     * @throws ValidationException
     * @throws \RuntimeException when the approval write cannot be verified
     */
    public function execute(int|string $id, int $adminId): void
    {
        Gate::authorize('admin-action');

        $artisan = User::whereIn('role', ['artisan', 'supplier'])->where('artisan_status', 'pending')->findOrFail($id);

        // REQUIREMENT: Admin must have previewed all required documents before approving
        $requiredKeys = [];
        foreach (['business_permit', 'dti_registration', 'valid_id', 'tin_id'] as $field) {
            if (!empty($artisan->$field)) {
                $requiredKeys[] = $field;
            }
        }

        $viewedKeys = ArtisanDocumentReviews::keysFor($artisan->id);
        $missingKeys = array_diff($requiredKeys, $viewedKeys);

        if (!empty($missingKeys)) {
            throw ValidationException::withMessages([
                'documents' => 'Preview all submitted documents before approving this application.'
            ]);
        }

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

            // Never report success on a write that did not land. Reading the row
            // back inside the transaction rolls everything back if it did not.
            if ($artisan->refresh()->artisan_status !== 'approved') {
                throw new \RuntimeException('Artisan approval did not persist to the database.');
            }

            $artisan->resolveActiveRevisions();
        });

        ArtisanDocumentReviews::forgetSession($id);

        // Log Standardized Audit Activity
        app(\App\Actions\Audit\RecordAuditActivity::class)->execute(
            action: 'artisan.approved',
            description: "Approved artisan application for: {$artisan->shop_name} ({$artisan->name})",
            subject: $artisan,
            diff: [
                'artisan_id' => $artisan->id,
                'shop_name' => $artisan->shop_name,
                'before' => ['artisan_status' => 'pending'],
                'after' => ['artisan_status' => 'approved', 'approved_by' => $adminId],
            ],
            actorId: $adminId,
        );

        try {
            if ($artisan->email) {
                $mailer = Mail::to($artisan->email);
                if (app()->environment('production') && config('queue.default') !== 'sync') {
                    $mailer->queue(new ArtisanApproved($artisan));
                } else {
                    $mailer->send(new ArtisanApproved($artisan));
                }
            }
        } catch (\Throwable $e) {
            report($e);
            Log::error('Email failed: ' . $e->getMessage());
        }
    }
}
