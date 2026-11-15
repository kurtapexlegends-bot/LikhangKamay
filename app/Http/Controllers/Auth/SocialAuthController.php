<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthRedirectService;
use App\Support\PersonName;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Laravel\Socialite\Facades\Socialite;

class SocialAuthController extends Controller
{
    /**
     * Supported providers
     */
    protected array $providers = ['google', 'facebook'];

    protected function buildProviderRedirect(string $provider, string $role, bool $remember = false)
    {
        session([
            'social_auth_role' => $role,
            'social_auth_remember' => $remember,
        ]);

        /** @var \Laravel\Socialite\Two\AbstractProvider $driver */
        $driver = Socialite::driver($provider)->stateless();

        if (!$remember && $provider === 'google') {
            $driver = $driver->with(['prompt' => 'select_account']);
        }

        return $driver->redirect();
    }

    /**
     * Redirect to OAuth provider (for buyers)
     */
    public function redirect(string $provider)
    {
        if (!in_array($provider, $this->providers)) {
            return redirect()->route('login')->with('error', 'Unsupported provider.');
        }

        return $this->buildProviderRedirect(
            $provider,
            'buyer',
            request()->boolean('remember')
        );
    }

    /**
     * Redirect to OAuth provider (for artisans)
     */
    public function redirectArtisan(string $provider)
    {
        if (!in_array($provider, $this->providers)) {
            return redirect()->route('login')->with('error', 'Unsupported provider.');
        }

        return $this->buildProviderRedirect(
            $provider,
            'artisan',
            request()->boolean('remember')
        );
    }

    /**
     * Redirect to OAuth provider (for suppliers)
     */
    public function redirectSupplier(string $provider)
    {
        if (!in_array($provider, $this->providers)) {
            return redirect()->route('login')->with('error', 'Unsupported provider.');
        }

        return $this->buildProviderRedirect(
            $provider,
            'supplier',
            request()->boolean('remember')
        );
    }

    /**
     * Handle OAuth callback
     */
    public function callback(Request $request, string $provider, AuthRedirectService $authRedirectService)
    {
        if (!in_array($provider, $this->providers)) {
            return redirect()->route('login')->with('error', 'Unsupported provider.');
        }

        try {
            $socialUser = Socialite::driver($provider)->stateless()->user();
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::error("Socialite {$provider} authentication failed: " . $e->getMessage(), [
                'exception' => $e,
            ]);
            return redirect()->route('login')->with('error', 'Authentication failed: ' . $e->getMessage());
        }

        // Check if email is provided
        if (!$socialUser->getEmail()) {
            return redirect()->route('login')->with('error', 'Email is required. Please grant email permission.');
        }

        // Get the intended role from session
        $intendedRole = $request->session()->get('social_auth_role', 'buyer');
        $rememberSocialLogin = $request->session()->get('social_auth_remember', false);

        // Check if user already exists with this email
        $socialEmail = strtolower(trim((string) $socialUser->getEmail()));
        $existingUser = User::where('email', $socialEmail)->first();

        if ($existingUser) {
            // For existing users, link social provider and auto-verify email since Google proved ownership
            $updateData = [];
            if (!$existingUser->social_provider) {
                $updateData['social_provider'] = $provider;
                $updateData['social_id'] = $socialUser->getId();
                $updateData['avatar'] = $socialUser->getAvatar();
            }
            if (!$existingUser->hasVerifiedEmail()) {
                $updateData['email_verified_at'] = now();
            }
            if (
                in_array($existingUser->role, ['user', 'buyer'], true)
                && !$existingUser->is_test
                && rescue(fn() => Schema::hasColumn('users', 'kyc_liveness_verified_at'), false)
                && rescue(fn() => Schema::hasColumn('users', 'requires_checkout_face_check'), false)
                && $existingUser->kyc_liveness_verified_at === null
                && !$existingUser->requires_checkout_face_check
            ) {
                $updateData['requires_checkout_face_check'] = true;
            }
            if (!empty($updateData)) {
                $existingUser->update($updateData);
            }

            Auth::login($existingUser, $rememberSocialLogin);
            $request->session()->regenerate();
            $existingUser->update([
                'current_session_id' => $request->session()->getId(),
            ]);
            $request->session()->forget([
                'social_auth',
                'social_auth_role',
                'social_auth_remember',
            ]);

            return $authRedirectService->redirectAfterLogin($existingUser);
        }

        // New user - store social data in session and redirect to complete profile
        $request->session()->put('social_auth', [
            'provider' => $provider,
            'id' => $socialUser->getId(),
            'email' => $socialEmail,
            'name' => $socialUser->getName(),
            'avatar' => $socialUser->getAvatar(),
            'role' => $intendedRole,
            'remember' => $rememberSocialLogin,
        ]);

        return redirect()->route('auth.complete-profile');
    }

    /**
     * Show complete profile form for new social users
     */
    public function showCompleteProfile()
    {
        $socialData = session('social_auth');

        if (!$socialData) {
            return redirect()->route('login')->with('error', 'Social sign-in session expired. Please try again.');
        }

        $role = $socialData['role'] ?? 'buyer';
        $isArtisan = $role === 'artisan';
        $isSupplier = $role === 'supplier';
        [$suggestedFirstName, $suggestedLastName] = PersonName::split($socialData['name']);
        $policyService = app(\App\Services\PolicyService::class);
        $policyTypes = match ($role) {
            'supplier' => [\App\Models\PlatformPolicy::TYPE_SUPPLIER_AGREEMENT, \App\Models\PlatformPolicy::TYPE_SUPPLIER_PRIVACY],
            'artisan' => [\App\Models\PlatformPolicy::TYPE_SELLER_AGREEMENT, \App\Models\PlatformPolicy::TYPE_SELLER_PRIVACY],
            default => [\App\Models\PlatformPolicy::TYPE_TERMS_OF_SERVICE, \App\Models\PlatformPolicy::TYPE_PRIVACY_POLICY],
        };
        $legalPolicies = $policyService->getSerializedActivePolicies($policyTypes);

        return Inertia::render('Auth/CompleteProfile', [
            'email' => $socialData['email'],
            'suggestedName' => $socialData['name'],
            'suggestedFirstName' => $suggestedFirstName,
            'suggestedLastName' => $suggestedLastName,
            'provider' => $socialData['provider'],
            'isArtisan' => $isArtisan,
            'isSupplier' => $isSupplier,
            'legalPolicies' => $legalPolicies,
        ]);
    }

    /**
     * Complete profile and create user account
     */
    public function completeProfile(Request $request, AuthRedirectService $authRedirectService)
    {
        $socialData = session('social_auth');

        if (!$socialData) {
            return redirect()->route('login')->with('error', 'Session expired. Please try again.');
        }

        $role = $socialData['role'] ?? 'buyer';
        $isArtisan = $role === 'artisan';
        $isSupplier = $role === 'supplier';

        // Different validation for supplier vs artisan vs buyer
        if ($isSupplier) {
            $request->validate([
                'first_name' => 'required_without:name|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'name' => 'required_without:first_name|string|max:255',
                'company_name' => ['required_without:shop_name', 'nullable', 'string', 'max:50'],
                'shop_name' => ['required_without:company_name', 'nullable', 'string', 'max:50'],
                'password' => ['required', 'string', 'confirmed', \App\Support\PasswordRules::business()],
                'terms' => 'accepted',
            ]);
        } elseif ($isArtisan) {
            $request->validate([
                'first_name' => 'required_without:name|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'name' => 'required_without:first_name|string|max:255',
                'shop_name' => ['required', 'string', 'max:30', Rule::unique('users', 'shop_name')],
                'password' => ['required', 'string', 'confirmed', \App\Support\PasswordRules::business()],
                'terms' => 'accepted',
            ]);
        } else {
            $request->validate([
                'first_name' => 'required_without:name|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'name' => 'required_without:first_name|string|max:255',
                'password' => ['required', 'string', 'confirmed', \App\Support\PasswordRules::buyer()],
                'terms' => 'accepted',
            ]);
        }

        $name = PersonName::normalize(
            $request->input('first_name'),
            $request->input('last_name'),
            $request->input('name'),
        );

        // Create user with appropriate role
        $userData = [
            ...User::persistableNameAttributes($name),
            'email' => $socialData['email'],
            'password' => Hash::make($request->password),
            'role' => $isSupplier ? User::ROLE_SUPPLIER : ($isArtisan ? 'artisan' : 'buyer'),
            'social_provider' => $socialData['provider'],
            'social_id' => $socialData['id'],
            'avatar' => $socialData['avatar'],
            'email_verified_at' => now(), // Auto-verify social users
        ];

        if ($isSupplier) {
            $companyName = trim((string) ($request->company_name ?: $request->shop_name));
            $userData['shop_name'] = $companyName;
            $userData['artisan_status'] = 'pending';
            $userData['setup_completed_at'] = null;
        } elseif ($isArtisan) {
            $userData['shop_name'] = $request->shop_name;
        }

        if (rescue(fn() => Schema::hasColumn('users', 'requires_checkout_face_check'), false)) {
            $userData['requires_checkout_face_check'] = !$isArtisan && !$isSupplier;
        }

        $user = \Illuminate\Support\Facades\DB::transaction(function () use ($userData, $isArtisan, $isSupplier, $request) {
            $user = User::create($userData);

            if ($isArtisan) {
                $user->complianceAgreements()->create([
                    'document_type' => 'seller_terms',
                    'accepted_at' => now(),
                    'ip_address' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                ]);
            }

            if ($isSupplier) {
                \App\Models\ArtisanStatusLog::create([
                    'user_id' => $user->id,
                    'previous_status' => null,
                    'new_status' => 'pending',
                ]);
            }

            return $user;
        });

        $policyService = app(\App\Services\PolicyService::class);
        $policyTypes = match ($role) {
            'supplier' => [\App\Models\PlatformPolicy::TYPE_SUPPLIER_AGREEMENT, \App\Models\PlatformPolicy::TYPE_SUPPLIER_PRIVACY],
            'artisan' => [\App\Models\PlatformPolicy::TYPE_SELLER_AGREEMENT, \App\Models\PlatformPolicy::TYPE_SELLER_PRIVACY],
            default => [\App\Models\PlatformPolicy::TYPE_TERMS_OF_SERVICE, \App\Models\PlatformPolicy::TYPE_PRIVACY_POLICY],
        };
        foreach ($policyTypes as $policyType) {
            $policyService->recordUserConsent($user, $policyType, 'social_registration', $request);
        }

        // Clear session
        session()->forget([
            'social_auth',
            'social_auth_role',
            'social_auth_remember',
        ]);

        // Fire registered event and login
        if (!$user->hasVerifiedEmail()) {
            event(new Registered($user));
        } else {
            event(new \Illuminate\Auth\Events\Verified($user));
        }
        Auth::login($user, (bool) ($socialData['remember'] ?? false));
        $request->session()->regenerate();
        $user->update([
            'current_session_id' => $request->session()->getId(),
        ]);

        return ($isArtisan || $isSupplier)
            ? redirect()->to($authRedirectService->pathForVerifiedUser($user))
            : redirect()->intended($authRedirectService->pathForVerifiedUser($user));
    }
}
