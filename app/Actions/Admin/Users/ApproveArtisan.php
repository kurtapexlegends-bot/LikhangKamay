<?php

namespace App\Actions\Admin\Users;

use App\Models\User;
use App\Models\ArtisanStatusLog;
use App\Models\PlatformActivity;
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
     */
    public function execute(int|string $id, int $adminId): void
    {
        Gate::authorize('admin-action');

        $artisan = User::where('role', 'artisan')->where('artisan_status', 'pending')->findOrFail($id);

        // REQUIREMENT: Admin must have previewed all required documents before approving
        $requiredKeys = [];
        foreach (['business_permit', 'dti_registration', 'valid_id', 'tin_id'] as $field) {
            if (!empty($artisan->$field)) {
                $requiredKeys[] = $field;
            }
        }

        $viewedKeys = session()->get("artisan_review_docs_{$artisan->id}", []);
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

            $artisan->update([
                'artisan_status' => 'approved',
                'approved_at' => now(),
                'approved_by' => $adminId,
            ]);
        });

        session()->forget("artisan_review_docs_{$id}");

        // Log Activity
        PlatformActivity::log(
            'artisan_approved',
            "Approved artisan application for: {$artisan->shop_name} ({$artisan->name})",
            ['artisan_id' => $artisan->id, 'shop_name' => $artisan->shop_name]
        );

        try {
            if ($artisan->email) {
                Mail::to($artisan->email)->send(new ArtisanApproved($artisan));
            }
        } catch (\Exception $e) {
            Log::error('Email failed: ' . $e->getMessage());
        }
    }
}
