<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;

use App\Support\StructuredAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use App\Mail\NewArtisanApplication;
use App\Mail\ArtisanApplicationReceivedMail;
use App\Models\ArtisanStatusLog;
use App\Models\User as UserModel;
use App\Notifications\NewArtisanApplicationNotification;
use App\Services\DocumentForensicsService;
use App\Services\FaceDescriptorService;

class ArtisanSetupController extends Controller
{
    public function create()
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        // Guard: Only artisans can access this page
        if (!$user->isArtisan()) {
            return redirect('/shop');
        }
        
        // Guard: Already approved artisans go to dashboard
        if ($user->isApproved()) {
            return redirect()->route('dashboard');
        }
        
        // Guard: Pending approval artisans go to pending page
        if ($user->isPendingApproval() && $user->setup_completed_at) {
            return redirect()->route('artisan.pending');
        }
        
        $urlHelper = function (?string $path) {
            return \App\Services\StorageUrl::url($path);
        };

        return Inertia::render('Auth/ArtisanSetup', [
            'rejectionReason' => $user->artisan_rejection_reason,
            'activeRevision' => $user->formatActiveRevisionForFrontend(),
            'existingDocuments' => [
                'business_permit_url' => $urlHelper($user->business_permit),
                'dti_registration_url' => $urlHelper($user->dti_registration),
                'valid_id_url' => $urlHelper($user->valid_id),
                'tin_id_url' => $urlHelper($user->tin_id),
            ],
            'existingPayoutAccountNumber' => $user->payout_account_number,
            'kycSelfieUrl' => $urlHelper($user->kyc_selfie_path),
            'kycLivenessVerified' => !is_null($user->kyc_liveness_verified_at),
            'kycVerificationMeta' => $user->kyc_verification_meta,
        ]);
    }

    public function store(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        $step = $request->input('current_step');

        return match ((int) $step) {
            1 => $this->handleStepOne($user, $request),
            2 => $this->handleStepTwo($user, $request),
            3 => $this->handleStepThree($user, $request),
            default => back()->with('error', 'Invalid step'),
        };
    }

    private function handleStepOne(UserModel $user, Request $request)
    {
        $validated = $request->validate([
            'shop_name' => ['required', 'string', 'min:3', 'max:30', Rule::unique('users', 'shop_name')->ignore($user->id)],
            'phone_number' => 'required|string|max:20',
            'street_address' => 'required|string|max:255',
            'region' => 'required|string|max:255',
            'city' => 'required|string',
            'zip_code' => 'required|string|max:10',
            'barangay' => 'required|string',
            'latitude' => 'nullable|numeric|between:-90,90',
            'longitude' => 'nullable|numeric|between:-180,180',
        ]);

        $user->update([
            'shop_name' => $validated['shop_name'],
            'phone_number' => $validated['phone_number'],
            'street_address' => $validated['street_address'],
            'barangay' => $validated['barangay'],
            'city' => $validated['city'],
            'region' => $validated['region'],
            'zip_code' => $validated['zip_code'],
        ]);

        $address = $user->addresses()->first();
        $fullAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $validated['street_address'],
            'barangay' => $validated['barangay'],
            'city' => $validated['city'],
            'region' => $validated['region'],
            'postal_code' => $validated['zip_code'],
        ]);

        if (!$address) {
            $user->addresses()->create([
                'label' => 'Shop',
                'address_type' => 'office',
                'recipient_name' => $user->name ?? trim(($user->first_name ?? '') . ' ' . ($user->last_name ?? '')) ?: 'Artisan',
                'phone_number' => $validated['phone_number'],
                'street_address' => $validated['street_address'],
                'barangay' => $validated['barangay'],
                'city' => $validated['city'],
                'region' => $validated['region'],
                'postal_code' => $validated['zip_code'],
                'latitude' => $validated['latitude'] ?? null,
                'longitude' => $validated['longitude'] ?? null,
                'full_address' => $fullAddress,
                'is_default' => true,
            ]);
        } else {
            $address->update([
                'phone_number' => $validated['phone_number'],
                'street_address' => $validated['street_address'],
                'barangay' => $validated['barangay'],
                'city' => $validated['city'],
                'region' => $validated['region'],
                'postal_code' => $validated['zip_code'],
                'latitude' => $validated['latitude'] ?? $address->latitude,
                'longitude' => $validated['longitude'] ?? $address->longitude,
                'full_address' => $fullAddress,
            ]);
        }

        return back(); 
    }

    private function handleStepTwo(UserModel $user, Request $request)
    {
        $docs = ['business_permit', 'dti_registration', 'valid_id', 'tin_id'];
        $rules = [];

        foreach ($docs as $docKey) {
            $hasExisting = !empty($user->{$docKey});
            $rules[$docKey] = [
                $hasExisting ? 'nullable' : 'required',
                function ($attribute, $value, $fail) {
                    if ($value === null) {
                        return;
                    }
                    if ($value instanceof \Illuminate\Http\UploadedFile) {
                        $mime = $value->getMimeType();
                        $validMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
                        if (!in_array($mime, $validMimes, true)) {
                            $fail("The {$attribute} must be a file of type: jpg, jpeg, png, pdf.");
                        }
                        if ($value->getSize() > 4096 * 1024) {
                            $fail("The {$attribute} may not be greater than 4MB.");
                        }
                    } elseif (is_string($value)) {
                        if (!str_starts_with($value, 'legal_docs/')) {
                            $fail("The {$attribute} is an invalid document reference.");
                        }
                    } else {
                        $fail("The {$attribute} is invalid.");
                    }
                },
            ];
        }

        $request->validate($rules);

        $documentFlags = $user->document_flags ?? [];
        $upload = function ($key) use ($request, $user, &$documentFlags) {
            if ($this->isLockedApprovedField($user, $key)) {
                return $user->{$key};
            }

            if ($request->hasFile($key)) {
                $file = $request->file($key);
                $flags = [];

                if ($file->getSize() < 5120) { // < 5KB
                    $flags[] = 'empty_or_corrupt';
                }

                if (str_starts_with($file->getMimeType(), 'image/')) {
                    try {
                        $realPath = $file->getRealPath();
                        $dimensions = ($realPath && file_exists($realPath)) ? @getimagesize($realPath) : null;
                        if ($dimensions) {
                            $width = $dimensions[0];
                            $height = $dimensions[1];
                            if ($width < 300 || $height < 300) {
                                $flags[] = 'low_resolution';
                            }
                        }
                    } catch (\Throwable $e) {
                        // Defensive guard: never fail upload if metadata reading encounters I/O issues
                    }
                }

                $documentFlags[$key] = $flags;
                return $file->store('legal_docs', 'public');
            }

            if ($request->filled($key) && is_string($request->input($key))) {
                $path = $request->input($key);
                if (str_starts_with($path, 'legal_docs/')) {
                    return $path;
                }
            }

            return $user->{$key};
        };

        $validIdFile = $request->hasFile('valid_id') ? $request->file('valid_id') : null;
        $validIdCameraCaptured = $request->boolean('valid_id_camera_captured');

        $updatePayload = [
            'business_permit' => $upload('business_permit'),
            'dti_registration' => $upload('dti_registration'),
            'valid_id' => $upload('valid_id'),
            'tin_id' => $upload('tin_id'),
            'document_flags' => $documentFlags,
        ];

        $biometricUpdates = $this->evaluateAndPersistKycBiometrics($user, $request, $validIdFile, $validIdCameraCaptured);

        if ($request->filled('ocr_metadata')) {
            $rawOcrMeta = $request->input('ocr_metadata');
            $postedOcr = is_string($rawOcrMeta) ? json_decode($rawOcrMeta, true) : (array) $rawOcrMeta;
            if (is_array($postedOcr) && !empty($postedOcr)) {
                $meta = $biometricUpdates['kyc_verification_meta'] ?? $user->kyc_verification_meta ?? [];
                $meta['ocr'] = array_merge($meta['ocr'] ?? [], $postedOcr);
                $biometricUpdates['kyc_verification_meta'] = $meta;
            }
        }

        $user->update(array_merge($updatePayload, $biometricUpdates));

        return back();
    }

    private function handleStepThree(UserModel $user, Request $request)
    {
        $rawNumber = preg_replace('/\D/', '', (string) $request->input('payout_account_number'));
        if (str_starts_with($rawNumber, '639')) {
            $rawNumber = '0' . substr($rawNumber, 2);
        }
        $request->merge(['payout_account_number' => $rawNumber]);

        $validated = $request->validate([
            'payout_method' => ['required', 'string', 'in:gcash,maya,GCash,Maya'],
            'payout_account_name' => ['required', 'string', 'max:100'],
            'payout_account_number' => ['required', 'string', 'regex:/^09\d{9}$/'],
        ], [
            'payout_method.in' => 'Please select either GCash or Maya.',
            'payout_account_number.regex' => 'Please enter a valid 11-digit Philippine mobile number starting with 09.',
        ]);

        $normalizedMethod = strtolower($validated['payout_method']) === 'maya' ? 'Maya' : 'GCash';

        $biometricUpdates = ($request->filled('selfie_data_url') || $request->filled('face_descriptor') || $request->filled('id_face_descriptor'))
            ? $this->evaluateAndPersistKycBiometrics($user, $request)
            : [];

        $previousStatus = $user->artisan_status;
        $user->update(array_merge($biometricUpdates, [
            'payout_method' => $normalizedMethod,
            'payout_account_name' => trim($validated['payout_account_name']),
            'payout_account_number' => $validated['payout_account_number'],
            'setup_completed_at' => now(),
            'artisan_status' => 'pending',
            'artisan_rejection_reason' => null,
        ]));

        $user->resolveActiveRevisions();

        ArtisanStatusLog::create([
            'user_id' => $user->id,
            'previous_status' => $previousStatus,
            'new_status' => 'pending',
        ]);

        app(\App\Actions\Audit\RecordAuditActivity::class)->execute(
            action: 'artisan_registered',
            description: 'A new artisan shop applied: ' . $user->shop_name,
            subject: $user,
            diff: ['shop_name' => $user->shop_name],
            actorId: $user->id
        );

        $emailResult = $this->sendApplicationEmails($user);
        
        if ($emailResult === 'failed_send') {
            return redirect()
                ->route('artisan.pending')
                ->with('warning', 'Application submitted, but the admin notification email could not be sent.');
        }
        
        return redirect()->route('artisan.pending');
    }

    public function dismissWelcome(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();
        
        if ($user->isArtisan()) {
            $user->update(['artisan_welcomed' => true]);
        }
        
        return back();
    }

    private function sendApplicationEmails(UserModel $user): string
    {
        try {
            UserModel::query()
                ->where('role', 'super_admin')
                ->each(function (UserModel $admin) use ($user): void {
                    $admin->notify(new NewArtisanApplicationNotification($user));
                });
        } catch (\Throwable $e) {
            Log::error('Failed to notify super admins of new artisan application: ' . $e->getMessage(), [
                'artisan_id' => $user->id,
                'exception' => $e
            ]);
        }

        $adminEmails = collect([
            config('services.artisan_applications.notification_email'),
        ])
            ->flatMap(function ($value) {
                if (!filled($value)) {
                    return [];
                }

                return preg_split('/[,;]+/', (string) $value) ?: [];
            })
            ->merge(
                UserModel::query()
                    ->where('role', 'super_admin')
                    ->whereNotNull('email')
                    ->pluck('email')
            )
            ->map(fn ($email) => strtolower(trim((string) $email)))
            ->filter(fn ($email) => filter_var($email, FILTER_VALIDATE_EMAIL))
            ->unique()
            ->values();

        if ($adminEmails->isNotEmpty()) {
            try {
                $mailer = Mail::to($adminEmails->all());

                if (app()->environment('production') && config('queue.default') !== 'sync') {
                    $mailer->queue(new NewArtisanApplication($user));
                } else {
                    $mailer->send(new NewArtisanApplication($user));
                }
            } catch (\Throwable $e) {
                report($e);
                return 'failed_send';
            }
        }

        // Send acknowledgment receipt to applying artisan
        if (!empty($user->email)) {
            try {
                $artisanMailer = Mail::to($user->email);
                if (app()->environment('production') && config('queue.default') !== 'sync') {
                    $artisanMailer->queue(new ArtisanApplicationReceivedMail($user));
                } else {
                    $artisanMailer->send(new ArtisanApplicationReceivedMail($user));
                }
            } catch (\Throwable $e) {
                report($e);
                Log::error('Failed to send application confirmation email to artisan: ' . $e->getMessage(), [
                    'artisan_id' => $user->id,
                ]);
            }
        }

        if ($adminEmails->isEmpty()) {
            Log::warning('Artisan application submitted without an email recipient.', [
                'artisan_user_id' => $user->id,
                'shop_name' => $user->shop_name,
            ]);

            return 'no_recipients';
        }

        return 'success';
    }

    public function acceptTerms(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user && $user->isArtisan()) {
            $user->complianceAgreements()->updateOrCreate(
                ['document_type' => 'seller_terms'],
                [
                    'accepted_at' => now(),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]
            );

            $policyService = app(\App\Services\PolicyService::class);
            $policyService->recordUserConsent($user, \App\Models\PlatformPolicy::TYPE_SELLER_AGREEMENT, 'seller_terms', $request);
            $policyService->recordUserConsent($user, \App\Models\PlatformPolicy::TYPE_SELLER_PRIVACY, 'seller_terms', $request);
        }

        return back()->with('success', 'Terms accepted successfully.');
    }

    public function deleteDocument($type)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        if (!in_array($type, ['business_permit', 'dti_registration', 'valid_id', 'tin_id'])) {
            return back()->withErrors(['error' => 'Invalid document type.']);
        }

        if ($this->isLockedApprovedField($user, $type)) {
            return back()->withErrors([$type => 'This document has already been approved and is locked.']);
        }
        
        if ($user->{$type}) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($user->{$type});
            $meta = $user->kyc_verification_meta ?? [];
            if (isset($meta['ocr'][$type])) {
                unset($meta['ocr'][$type]);
            }
            $flags = $user->document_flags ?? [];
            unset($flags[$type]);
            $user->update([
                $type => null,
                'kyc_verification_meta' => $meta,
                'document_flags' => $flags,
            ]);
        }
        
        return back()->with('success', ucfirst(str_replace('_', ' ', $type)) . ' removed.');
    }

    public function uploadSingleDocument(Request $request, $type)
    {
        /** @var \App\Models\User $user */
        $user = Auth::user();
        
        if (!in_array($type, ['business_permit', 'dti_registration', 'valid_id', 'tin_id'])) {
            return back()->withErrors([$type => 'Invalid document type.']);
        }

        if ($this->isLockedApprovedField($user, $type)) {
            if ($request->expectsJson()) {
                return response()->json([
                    'message' => 'This document has already been approved and is locked.',
                    'errors' => [$type => ['This document has already been approved and is locked.']],
                ], 422);
            }
            return back()->withErrors([$type => 'This document has already been approved and is locked.']);
        }

        $ocrUpdates = $this->processOcrMetadata($request, $type, $user);

        if ($request->filled('document_key')) {
            $request->validate([
                'document_key' => ['required', 'string', 'max:255'],
            ]);

            $path = $request->input('document_key');
            if (!str_starts_with($path, 'legal_docs/')) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => 'Invalid document storage path.',
                        'errors' => [$type => ['Invalid document storage path.']],
                    ], 422);
                }
                return back()->withErrors([$type => 'Invalid document storage path.']);
            }

            if (!Storage::disk('public')->exists($path)) {
                if ($request->expectsJson()) {
                    return response()->json([
                        'message' => 'Uploaded document not found in storage.',
                        'errors' => [$type => ['Uploaded document not found in storage.']],
                    ], 422);
                }
                return back()->withErrors([$type => 'Uploaded document not found in storage.']);
            }

            // Delete old file if exists and different
            if ($user->{$type} && $user->{$type} !== $path) {
                Storage::disk('public')->delete($user->{$type});
            }

            $updateData = array_merge([$type => $path], $ocrUpdates);
            if ($type === 'valid_id') {
                $ext = strtolower((string) pathinfo($path, PATHINFO_EXTENSION));
                $forensics = $ext === 'pdf'
                    ? ['status' => 'clean', 'points' => 15, 'has_camera_exif' => false, 'has_editor_or_ai_tag' => false, 'signals' => ['Uploaded as PDF scan']]
                    : rescue(function () use ($path, $request) {
                        $tmpPath = sys_get_temp_dir() . '/kyc_' . basename($path);
                        file_put_contents($tmpPath, Storage::disk('public')->get($path));
                        try {
                            return app(DocumentForensicsService::class)->inspectUploadedFile($tmpPath, $request->boolean('camera_captured'));
                        } finally {
                            @unlink($tmpPath);
                        }
                    }, null, report: false);

                $bioUpdates = $this->evaluateAndPersistKycBiometrics($user, $request, null, $request->boolean('camera_captured'), $forensics);
                if (isset($ocrUpdates['kyc_verification_meta']['ocr']) && isset($bioUpdates['kyc_verification_meta'])) {
                    $bioUpdates['kyc_verification_meta']['ocr'] = array_merge(
                        $bioUpdates['kyc_verification_meta']['ocr'] ?? [],
                        $ocrUpdates['kyc_verification_meta']['ocr']
                    );
                }
                $updateData = array_merge($updateData, $bioUpdates);
            }

            $user->update($updateData);

            if ($request->expectsJson()) {
                $user->refresh();
                return response()->json([
                    'message' => ucfirst(str_replace('_', ' ', $type)) . ' uploaded successfully.',
                    'type' => $type,
                    'path' => $path,
                    'url' => \App\Services\StorageUrl::url($path),
                    'kyc_verification_meta' => $user->kyc_verification_meta,
                ]);
            }

            return back()->with('success', ucfirst(str_replace('_', ' ', $type)) . ' uploaded successfully.');
        }

        $request->validate([
            'document' => ['required', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:4096'],
        ]);

        $file = $request->file('document');
        $flags = [];

        // Check file size (suspiciously small)
        if ($file->getSize() < 5120) { // < 5KB
            $flags[] = 'empty_or_corrupt';
        }

        // Check image resolution if it's an image
        if (str_starts_with($file->getMimeType(), 'image/')) {
            $realPath = $file->getRealPath();
            $dimensions = $realPath ? @getimagesize($realPath) : null;
            if ($dimensions) {
                $width = $dimensions[0];
                $height = $dimensions[1];
                if ($width < 300 || $height < 300) {
                    $flags[] = 'low_resolution';
                }
            }
        }

        $extraBiometrics = $type === 'valid_id'
            ? $this->evaluateAndPersistKycBiometrics($user, $request, $file, $request->boolean('camera_captured'))
            : [];

        // Delete old file if exists
        if ($user->{$type}) {
            Storage::disk('public')->delete($user->{$type});
        }

        $path = $file->store('legal_docs', 'public');
        
        // Update document flags array
        $documentFlags = $ocrUpdates['document_flags'] ?? ($user->document_flags ?? []);
        $documentFlags[$type] = array_values(array_unique(array_merge($documentFlags[$type] ?? [], $flags)));

        $mergedMeta = $user->kyc_verification_meta ?? [];
        if (isset($ocrUpdates['kyc_verification_meta']['ocr'])) {
            $mergedMeta['ocr'] = array_merge($mergedMeta['ocr'] ?? [], $ocrUpdates['kyc_verification_meta']['ocr']);
        }
        if (isset($extraBiometrics['kyc_verification_meta'])) {
            $mergedMeta = array_merge($mergedMeta, $extraBiometrics['kyc_verification_meta']);
            if (isset($ocrUpdates['kyc_verification_meta']['ocr'])) {
                $mergedMeta['ocr'] = array_merge($mergedMeta['ocr'] ?? [], $ocrUpdates['kyc_verification_meta']['ocr']);
            }
            unset($extraBiometrics['kyc_verification_meta']);
        }

        $user->update(array_merge([
            $type => $path,
            'document_flags' => $documentFlags,
            'kyc_verification_meta' => $mergedMeta,
        ], $extraBiometrics));

        if ($request->expectsJson()) {
            $user->refresh();
            return response()->json([
                'message' => ucfirst(str_replace('_', ' ', $type)) . ' uploaded successfully.',
                'type' => $type,
                'path' => $path,
                'url' => \App\Services\StorageUrl::url($path),
                'kyc_verification_meta' => $user->kyc_verification_meta,
            ]);
        }

        return back()->with('success', ucfirst(str_replace('_', ' ', $type)) . ' uploaded successfully.');
    }

    /**
     * Evaluate liveness selfie, 128-D face match against Valid ID, banned duplicate screening,
     * and document metadata forensics to compute a 100-point composite KYC authenticity score.
     */
    private function evaluateAndPersistKycBiometrics(
        UserModel $user,
        Request $request,
        ?\Illuminate\Http\UploadedFile $validIdFile = null,
        bool $cameraCaptured = false,
        ?array $precomputedForensics = null
    ): array {
        $faceService = app(FaceDescriptorService::class);
        $forensicsService = app(DocumentForensicsService::class);
        $updates = [];

        // 1. Store live selfie & 128-D descriptor if submitted during KYC step
        $selfieDescriptor = $faceService->normalizeDescriptor($user->face_descriptor);
        $faceVerificationLocked = $this->isLockedApprovedField($user, 'face_verification');

        if (!$faceVerificationLocked && $request->filled('selfie_data_url')) {
            $selfiePath = $faceService->storeSelfieDataUrl((string) $request->input('selfie_data_url'), "u{$user->id}");
            if ($selfiePath) {
                if ($user->kyc_selfie_path) {
                    Storage::disk('public')->delete($user->kyc_selfie_path);
                }
                $updates['kyc_selfie_path'] = $selfiePath;
                $updates['kyc_liveness_verified_at'] = now();
                $updates['requires_checkout_face_check'] = false;
            }
        }

        if (!$faceVerificationLocked && $request->filled('face_descriptor')) {
            $incomingDesc = $faceService->normalizeDescriptor($request->input('face_descriptor'));
            if ($incomingDesc) {
                $selfieDescriptor = $incomingDesc;
                $updates['face_descriptor'] = $incomingDesc;
            }
        }

        // 2. Server-side match calculation when both Selfie and ID descriptors are available
        $idDescriptor = $faceService->normalizeDescriptor($request->input('id_face_descriptor'))
            ?? $faceService->normalizeDescriptor($user->kyc_verification_meta['id_face_descriptor'] ?? null);
        $matchScore = $user->kyc_verification_meta['match_score'] ?? null;
        $idFaceDetected = $user->kyc_verification_meta['id_face_detected'] ?? null;

        if ($request->has('id_face_detected')) {
            $idFaceDetected = $request->boolean('id_face_detected');
        }

        if ($selfieDescriptor && $idDescriptor) {
            $distance = $faceService->euclideanDistance($selfieDescriptor, $idDescriptor);
            $matchScore = $faceService->distanceToMatchPercentage($distance);
            $idFaceDetected = true;
        } elseif ($request->filled('face_match_score')) {
            $matchScore = max(0, min(100, (int) $request->input('face_match_score')));
        }

        // 3. Document Forensics
        $forensics = $precomputedForensics
            ?? ($validIdFile ? $forensicsService->inspectUploadedFile($validIdFile, $cameraCaptured) : null)
            ?? ($user->kyc_verification_meta['forensics'] ?? ['status' => 'clean', 'points' => 12, 'signals' => []]);

        // 4. Duplicate Banned Account Screening
        $bannedMatch = false;
        if ($selfieDescriptor) {
            $bannedCheck = $faceService->checkBannedDuplicate($selfieDescriptor, $user->id);
            $bannedMatch = (bool) ($bannedCheck['matched_banned'] ?? false);
        }

        $livenessPassed = isset($updates['kyc_liveness_verified_at']) || $user->kyc_liveness_verified_at !== null;
        $composite = $forensicsService->computeCompositeScore([
            'liveness_passed' => $livenessPassed,
            'match_score' => $matchScore,
            'id_face_detected' => $idFaceDetected,
            'forensics' => $forensics,
            'banned_face_match' => $bannedMatch,
            'camera_captured' => $cameraCaptured || (bool) ($user->kyc_verification_meta['camera_captured'] ?? false),
        ]);

        $composite['forensics'] = $forensics;
        if ($idDescriptor) {
            $composite['id_face_descriptor'] = $idDescriptor;
        }
        if (!empty($user->kyc_verification_meta['ocr'])) {
            $composite['ocr'] = $user->kyc_verification_meta['ocr'];
        }
        $updates['kyc_verification_meta'] = $composite;

        return $updates;
    }

    /**
     * Determine whether a KYC document or face check field is already approved and locked
     * during an active targeted revision request.
     */
    private function isLockedApprovedField(UserModel $user, string $fieldKey): bool
    {
        if ($user->artisan_status !== 'rejected') {
            return false;
        }

        $activeRevision = $user->formatActiveRevisionForFrontend();
        $flaggedKeys = $activeRevision['flagged_keys'] ?? [];
        if (empty($flaggedKeys)) {
            return false;
        }

        if (in_array($fieldKey, $flaggedKeys, true)) {
            return false;
        }

        if ($fieldKey === 'face_verification') {
            return $user->kyc_liveness_verified_at !== null || !empty($user->kyc_selfie_path);
        }

        return !empty($user->{$fieldKey});
    }

    /**
     * Process incoming client-side OCR extraction metadata, update document flags,
     * and persist to user's kyc_verification_meta['ocr'].
     */
    private function processOcrMetadata(Request $request, string $type, UserModel $user): array
    {
        $rawOcr = $request->input('ocr_data');
        if (empty($rawOcr)) {
            return [];
        }

        $ocrData = is_string($rawOcr) ? json_decode($rawOcr, true) : (array) $rawOcr;
        if (!is_array($ocrData) || empty($ocrData)) {
            return [];
        }

        $meta = $user->kyc_verification_meta ?? [];
        $ocrRegistry = $meta['ocr'] ?? [];
        $ocrRegistry[$type] = [
            'status' => $ocrData['status'] ?? ($request->input('ocr_status') ?? 'scanned'),
            'matched' => (bool) ($ocrData['matched'] ?? false),
            'badge_text' => $ocrData['badgeText'] ?? ($request->input('ocr_summary') ?? null),
            'badge_tone' => $ocrData['badgeTone'] ?? 'stone',
            'extracted_value' => $ocrData['extractedValue'] ?? ($request->input('ocr_extracted_value') ?? null),
            'shop_matched' => isset($ocrData['shopMatched']) ? (bool) $ocrData['shopMatched'] : null,
            'confidence' => isset($ocrData['confidence']) ? (int) $ocrData['confidence'] : null,
            'signals' => is_array($ocrData['signals'] ?? null) ? $ocrData['signals'] : [],
            'summary_text' => $ocrData['summaryText'] ?? null,
            'scanned_at' => now()->toIso8601String(),
        ];
        $meta['ocr'] = $ocrRegistry;

        $documentFlags = $user->document_flags ?? [];
        $typeFlags = $documentFlags[$type] ?? [];

        if (!empty($ocrData['matched'])) {
            $flagKey = match ($type) {
                'business_permit' => 'ocr_permit_verified',
                'dti_registration' => 'ocr_dti_matched',
                'tin_id' => 'ocr_tin_matched',
                'valid_id' => 'ocr_id_detected',
                default => 'ocr_verified',
            };
            if (!in_array($flagKey, $typeFlags, true)) {
                $typeFlags[] = $flagKey;
            }
        }

        $documentFlags[$type] = array_values(array_unique($typeFlags));

        return [
            'kyc_verification_meta' => $meta,
            'document_flags' => $documentFlags,
        ];
    }

    /**
     * Convert a rejected artisan account back to a standard buyer user account.
     */
    public function convertToBuyer(Request $request)
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if (!$user->isRejected()) {
            abort(403, 'Only declined applications can be converted.');
        }

        // Delete uploaded files
        $docs = ['business_permit', 'dti_registration', 'valid_id', 'tin_id'];
        foreach ($docs as $doc) {
            if ($user->{$doc}) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($user->{$doc});
            }
        }

        $user->update([
            'role' => 'user',
            'artisan_status' => 'pending',
            'artisan_rejection_reason' => null,
            'setup_completed_at' => null,
            'shop_name' => null,
            'shop_slug' => null,
            'business_permit' => null,
            'dti_registration' => null,
            'valid_id' => null,
            'tin_id' => null,
            'payout_method' => null,
            'payout_account_name' => null,
            'payout_account_number' => null,
            'document_flags' => null,
        ]);

        return redirect()->route('home')->with('success', 'Your account has been converted to a buyer account.');
    }
}
