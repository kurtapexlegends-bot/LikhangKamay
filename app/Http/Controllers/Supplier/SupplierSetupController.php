<?php

declare(strict_types=1);

namespace App\Http\Controllers\Supplier;

use App\Actions\Audit\RecordAuditActivity;
use App\Http\Controllers\Controller;
use App\Http\Requests\Supplier\SupplierSetupRequest;
use App\Models\ArtisanStatusLog;
use App\Models\User;
use App\Services\StorageUrl;
use App\Support\StructuredAddress;
use App\Support\SupplierAddress;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
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

        $normalizedAddress = StructuredAddress::formatPhilippineAddress([
            'street_address' => $validated['street_address'],
            'barangay' => $validated['barangay'],
            'city' => $validated['city'],
            'region' => $validated['province'],
            'postal_code' => $validated['postal_code'],
        ]);

        DB::transaction(function () use ($user, $validated, $docPaths, $normalizedAddress, $recordAudit) {
            $previousStatus = $user->artisan_status;

            $user->update([
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
            ]);

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
                ],
                actorId: $user->id
            );
        });

        return redirect()->route('supplier.pending')->with('success', 'Warehouse details and business permit submitted! Our admin team will review your application.');
    }
}
