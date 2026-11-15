<?php

declare(strict_types=1);

namespace App\Http\Controllers\Auth;

use App\Actions\Audit\RecordAuditActivity;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\SupplierRegistrationRequest;
use App\Models\ArtisanStatusLog;
use App\Models\PlatformPolicy;
use App\Models\User;
use App\Services\PolicyService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class SupplierRegistrationController extends Controller
{
    /**
     * Show the dedicated supplier registration form.
     */
    public function create(Request $request): Response|RedirectResponse
    {
        /** @var User|null $user */
        $user = Auth::user();

        if ($user) {
            if ($user->isSupplier()) {
                if (is_null($user->setup_completed_at)) {
                    return redirect()->route('supplier.setup');
                }

                return $user->isApproved()
                    ? redirect()->route('supplier.dashboard')
                    : redirect()->route('supplier.pending');
            }

            return redirect()->route('dashboard');
        }

        $policyService = app(PolicyService::class);
        $legalPolicies = $policyService->getSerializedActivePolicies([
            PlatformPolicy::TYPE_SUPPLIER_AGREEMENT,
            PlatformPolicy::TYPE_SUPPLIER_PRIVACY,
        ]);

        return Inertia::render('Auth/SupplierRegister', [
            'legalPolicies' => $legalPolicies,
        ]);
    }

    /**
     * Handle incoming supplier registration request.
     */
    public function store(
        SupplierRegistrationRequest $request,
        PolicyService $policyService,
        RecordAuditActivity $recordAudit
    ): RedirectResponse {
        $validated = $request->validated();

        $firstName = trim($validated['first_name']);
        $lastName = trim($validated['last_name'] ?? '');
        $fullName = trim($firstName . ' ' . $lastName);

        $user = DB::transaction(function () use ($validated, $firstName, $lastName, $fullName, $recordAudit) {
            $supplier = User::create([
                'name' => $fullName,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => strtolower(trim($validated['email'])),
                'password' => Hash::make($validated['password']),
                'role' => User::ROLE_SUPPLIER,
                'shop_name' => trim($validated['company_name']),
                'artisan_status' => 'pending',
                'setup_completed_at' => null,
            ]);

            ArtisanStatusLog::create([
                'user_id' => $supplier->id,
                'previous_status' => null,
                'new_status' => 'pending',
            ]);

            $recordAudit->execute(
                action: 'supplier_registered',
                description: "New wholesale supplier registered: {$supplier->shop_name}",
                subject: $supplier,
                diff: ['company_name' => $supplier->shop_name],
                actorId: $supplier->id
            );

            return $supplier;
        });

        $policyTypes = [PlatformPolicy::TYPE_SUPPLIER_AGREEMENT, PlatformPolicy::TYPE_SUPPLIER_PRIVACY];
        foreach ($policyTypes as $policyType) {
            $policyService->recordUserConsent($user, $policyType, 'supplier_registration', $request);
        }

        Auth::login($user);
        $request->session()->regenerate();
        $user->update([
            'current_session_id' => $request->session()->getId(),
        ]);

        try {
            event(new Registered($user));
        } catch (\Throwable $exception) {
            Log::error('Supplier registration verification code email failed to send.', [
                'user_id' => $user->id,
                'email' => $user->email,
                'message' => $exception->getMessage(),
            ]);

            return redirect()->route('verification.notice')
                ->with('error', 'Account created, but we could not send the verification code right now. Please try resending it from the verification page.');
        }

        return redirect()->route('verification.notice')->with('status', 'verification-code-sent');
    }
}
