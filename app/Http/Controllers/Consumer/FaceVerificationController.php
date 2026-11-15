<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Services\FaceDescriptorService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class FaceVerificationController extends Controller
{
    public function store(Request $request, FaceDescriptorService $faceService): RedirectResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        $request->validate([
            'selfie_data_url' => ['required', 'string'],
            'face_descriptor' => ['nullable'],
        ]);

        $descriptor = $faceService->normalizeDescriptor($request->input('face_descriptor'));
        if ($descriptor) {
            $bannedCheck = $faceService->checkBannedDuplicate($descriptor, $user->id);
            if (!empty($bannedCheck['matched_banned'])) {
                throw ValidationException::withMessages([
                    'face_verification' => 'Verification cannot proceed because this identity matches a restricted account.',
                ]);
            }
        }

        $selfiePath = $faceService->storeSelfieDataUrl((string) $request->input('selfie_data_url'), "u{$user->id}");
        if (!$selfiePath) {
            throw ValidationException::withMessages([
                'face_verification' => 'The captured photo could not be saved. Please try again in clear lighting.',
            ]);
        }

        if (rescue(fn() => Schema::hasColumn('users', 'kyc_selfie_path'), false) && $user->kyc_selfie_path) {
            Storage::disk('public')->delete($user->kyc_selfie_path);
        }

        $updates = [];
        if (rescue(fn() => Schema::hasColumn('users', 'kyc_selfie_path'), false)) {
            $updates['kyc_selfie_path'] = $selfiePath;
        }
        if (rescue(fn() => Schema::hasColumn('users', 'kyc_liveness_verified_at'), false)) {
            $updates['kyc_liveness_verified_at'] = now();
        }
        if (rescue(fn() => Schema::hasColumn('users', 'requires_checkout_face_check'), false)) {
            $updates['requires_checkout_face_check'] = false;
        }
        if (rescue(fn() => Schema::hasColumn('users', 'face_descriptor'), false)) {
            $updates['face_descriptor'] = $descriptor ?? $user->face_descriptor;
        }

        if (!empty($updates)) {
            $user->update($updates);
        }

        return back()->with('success', 'Quick face check completed. You will not be asked again during checkout.');
    }
}
