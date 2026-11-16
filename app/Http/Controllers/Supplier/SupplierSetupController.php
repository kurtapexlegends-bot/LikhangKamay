<?php

declare(strict_types=1);

namespace App\Http\Controllers\Supplier;

use App\Actions\Audit\RecordAuditActivity;
use App\Http\Controllers\Controller;
use App\Http\Requests\Supplier\SupplierSetupRequest;
use App\Models\ArtisanStatusLog;
use App\Models\User;
use App\Services\FaceDescriptorService;
use App\Services\StorageUrl;
use App\Support\StructuredAddress;
use App\Support\SupplierAddress;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class SupplierSetupController extends Controller
{
    /**
     * Show the supplier onboarding setup screen.
     */
    public function create(): Response|RedirectResponse
    {
        /** @var User|null $user */
        $user = Auth::user();

        if (!$user || !$user->isSupplier()) {
            return redirect()->route('dashboard');
        }

        if ($user->isApproved()) {
            return redirect()->route('supplier.dashboard');
        }

        if ($user->setup_completed_at && $user->artisan_status !== 'rejected') {
            return redirect()->route('supplier.pending');
        }

        $defaultAddress = $user->addresses()->where('label', 'Warehouse')->first()
            ?: $user->addresses()->where('is_default', true)->first();

        return Inertia::render('Supplier/Setup', [
            'supportedProvinces' => SupplierAddress::SUPPORTED_PROVINCES,
            'regionalCities' => SupplierAddress::REGIONAL_CITIES,
            'existingData' => [
                'company_name' => $user->shop_name,
                'contact_name' => $user->name,
                'phone_number' => $user->phone_number,
                'email' => $user->email,
                'province' => $defaultAddress?->region ?: ($user->region ?: 'Cavite'),
                'city' => $defaultAddress?->city ?: ($user->city ?: ''),
                'barangay' => $defaultAddress?->barangay ?: ($user->barangay ?: ''),
                'postal_code' => $defaultAddress?->postal_code ?: ($user->zip_code ?: ''),
                'street_address' => $defaultAddress?->street_address ?: ($user->street_address ?: ''),
                'latitude' => $defaultAddress?->latitude ?: $user->latitude,
                'longitude' => $defaultAddress?->longitude ?: $user->longitude,
                'tin_number' => $user->tin ?: '',
                'has_permit' => !empty($user->business_permit),
                'business_permit_url' => StorageUrl::url($user->business_permit),
                'has_dti' => !empty($user->dti_registration),
                'dti_registration_url' => StorageUrl::url($user->dti_registration),
                'has_valid_id' => !empty($user->valid_id),
                'valid_id_url' => StorageUrl::url($user->valid_id),
                'has_tin_id' => !empty($user->tin_id),
                'tin_id_url' => StorageUrl::url($user->tin_id),
                'kyc_selfie_url' => StorageUrl::url($user->kyc_selfie_path),
                'kyc_liveness_verified' => !empty($user->kyc_liveness_verified_at),
                'match_score' => $user->kyc_verification_meta['match_score'] ?? null,
                'id_face_detected' => $user->kyc_verification_meta['id_face_detected'] ?? null,
                'id_face_descriptor' => $user->kyc_verification_meta['id_face_descriptor'] ?? null,
            ],
            'rejectionReason' => $user->artisan_rejection_reason,
        ]);
    }

    /**
     * Store the warehouse address and verification documents.
     */
    public function store(
        SupplierSetupRequest $request,
        RecordAuditActivity $recordAudit
    ): RedirectResponse {
        /** @var User $user */
        $user = Auth::user();

        $validated = $request->validated();

        $docKeys = ['business_permit', 'dti_registration', 'valid_id', 'tin_id'];
        $docPaths = [];

        foreach ($docKeys as $key) {
            $docPaths[$key] = $user->{$key};

            if ($request->hasFile($key)) {
                $docPaths[$key] = $request->file($key)->store('legal_docs', 'public');
            } elseif ($request->filled($key) && is_string($request->input($key))) {
                $val = $request->input($key);
                if (str_starts_with($val, 'legal_docs/')) {
                    $docPaths[$key] = $val;
                }
            }
        }

        // Process biometric face verification & ID match
        $faceService = app(FaceDescriptorService::class);
        $biometricUpdates = [];

        if ($request->filled('selfie_data_url')) {
            $selfiePath = $faceService->storeSelfieDataUrl((string) $request->input('selfie_data_url'), "u{$user->id}");
            if ($selfiePath) {
                if ($user->kyc_selfie_path) {
                    rescue(fn () => Storage::disk('public')->delete($user->kyc_selfie_path), false, report: false);
                }
                $biometricUpdates['kyc_selfie_path'] = $selfiePath;
                $biometricUpdates['kyc_liveness_verified_at'] = now();
                $biometricUpdates['requires_checkout_face_check'] = false;
            }
        }

        $selfieDescriptor = $faceService->normalizeDescriptor($user->face_descriptor);
        if ($request->filled('face_descriptor')) {
            $incomingDesc = $faceService->normalizeDescriptor($request->input('face_descriptor'));
            if ($incomingDesc) {
                $selfieDescriptor = $incomingDesc;
                $biometricUpdates['face_descriptor'] = $incomingDesc;
            }
        }

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

        $livenessPassed = isset($biometricUpdates['kyc_liveness_verified_at']) || $user->kyc_liveness_verified_at !== null;
        $existingMeta = is_array($user->kyc_verification_meta) ? $user->kyc_verification_meta : [];

        $biometricUpdates['kyc_verification_meta'] = array_merge($existingMeta, [
            'liveness_passed' => $livenessPassed,
            'match_score' => $matchScore,
            'id_face_detected' => $idFaceDetected,
            'id_face_descriptor' => $idDescriptor,
            'face_match_score' => $matchScore,
            'verified_at' => now()->toIso8601String(),
        ]);

        $normalizedAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $validated['street_address'],
            'barangay' => $validated['barangay'],
            'city' => $validated['city'],
            'region' => $validated['province'],
            'postal_code' => $validated['postal_code'],
        ]);

        DB::transaction(function () use ($user, $validated, $docPaths, $biometricUpdates, $matchScore, $normalizedAddress, $recordAudit) {
            $previousStatus = $user->artisan_status;

            $user->update(array_merge($biometricUpdates, [
                'phone_number' => $validated['phone_number'],
                'street_address' => $validated['street_address'],
                'barangay' => $validated['barangay'],
                'city' => $validated['city'],
                'region' => $validated['province'],
                'zip_code' => $validated['postal_code'],
                'latitude' => $validated['latitude'] ?? $user->latitude,
                'longitude' => $validated['longitude'] ?? $user->longitude,
                'business_permit' => $docPaths['business_permit'],
                'dti_registration' => $docPaths['dti_registration'],
                'valid_id' => $docPaths['valid_id'],
                'tin_id' => $docPaths['tin_id'],
                'tin' => $validated['tin_number'] ?? $user->tin,
                'artisan_status' => 'pending',
                'artisan_rejection_reason' => null,
                'setup_completed_at' => now(),
            ]));

            $user->resolveActiveRevisions();

            $user->addresses()->updateOrCreate(
                ['user_id' => $user->id, 'label' => 'Warehouse'],
                [
                    'address_type' => 'office',
                    'recipient_name' => $user->name,
                    'phone_number' => $validated['phone_number'],
                    'street_address' => $validated['street_address'],
                    'barangay' => $validated['barangay'],
                    'city' => $validated['city'],
                    'region' => $validated['province'],
                    'postal_code' => $validated['postal_code'],
                    'latitude' => $validated['latitude'] ?? null,
                    'longitude' => $validated['longitude'] ?? null,
                    'full_address' => $normalizedAddress,
                    'is_default' => true,
                ]
            );

            ArtisanStatusLog::create([
                'user_id' => $user->id,
                'previous_status' => $previousStatus,
                'new_status' => 'pending',
            ]);

            $recordAudit->execute(
                action: 'supplier_setup_completed',
                description: "Supplier {$user->shop_name} completed warehouse setup & verification submission.",
                subject: $user,
                diff: [
                    'province' => $validated['province'],
                    'city' => $validated['city'],
                    'has_permit' => (bool) ($docPaths['business_permit'] ?? false),
                    'has_dti' => (bool) ($docPaths['dti_registration'] ?? false),
                    'has_valid_id' => (bool) ($docPaths['valid_id'] ?? false),
                    'has_tin_id' => (bool) ($docPaths['tin_id'] ?? false),
                    'has_selfie' => (bool) ($user->kyc_selfie_path || isset($biometricUpdates['kyc_selfie_path'])),
                    'liveness_verified' => (bool) ($user->kyc_liveness_verified_at || isset($biometricUpdates['kyc_liveness_verified_at'])),
                    'match_score' => $matchScore,
                ],
                actorId: $user->id
            );
        });

        return redirect()->route('supplier.pending')->with('success', 'Warehouse details and business permit submitted! Our admin team will review your application.');
    }
}
