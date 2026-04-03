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
use Illuminate\Validation\Rule;
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

        $driver = Socialite::driver($provider);

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
     * Handle OAuth callback
     */
    public function callback(string $provider, AuthRedirectService $authRedirectService)
    {
        if (!in_array($provider, $this->providers)) {
            return redirect()->route('login')->with('error', 'Unsupported provider.');
        }

        try {
            $socialUser = Socialite::driver($provider)->user();
        } catch (\Exception $e) {
            return redirect()->route('login')->with('error', 'Authentication failed. Please try again.');
        }

        // Check if email is provided
        if (!$socialUser->getEmail()) {
            return redirect()->route('login')->with('error', 'Email is required. Please grant email permission.');
        }

        // Get the intended role from session
        $intendedRole = session('social_auth_role', 'buyer');
        $rememberSocialLogin = session('social_auth_remember', false);

        // Check if user already exists with this email
        $existingUser = User::where('email', $socialUser->getEmail())->first();

        if ($existingUser) {
            // For existing users, just log them in (don't change their role)
            if (!$existingUser->social_provider) {
                $existingUser->update([
                    'social_provider' => $provider,
                    'social_id' => $socialUser->getId(),
                    'avatar' => $socialUser->getAvatar(),
                ]);
            }

            Auth::login($existingUser, $rememberSocialLogin);
            request()->session()->regenerate();
            session()->forget([
                'social_auth',
                'social_auth_role',
                'social_auth_remember',
            ]);

            return $authRedirectService->redirectAfterLogin($existingUser);
        }

        // New user - store social data in session and redirect to complete profile
        session([
            'social_auth' => [
                'provider' => $provider,
                'id' => $socialUser->getId(),
                'email' => $socialUser->getEmail(),
                'name' => $socialUser->getName(),
                'avatar' => $socialUser->getAvatar(),
                'role' => $intendedRole,
                'remember' => $rememberSocialLogin,
            ]
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
            return redirect()->route('login');
        }

        $isArtisan = ($socialData['role'] ?? 'buyer') === 'artisan';
        [$suggestedFirstName, $suggestedLastName] = PersonName::split($socialData['name']);

        return Inertia::render('Auth/CompleteProfile', [
            'email' => $socialData['email'],
            'suggestedName' => $socialData['name'],
            'suggestedFirstName' => $suggestedFirstName,
            'suggestedLastName' => $suggestedLastName,
            'provider' => $socialData['provider'],
            'isArtisan' => $isArtisan,
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

        $isArtisan = ($socialData['role'] ?? 'buyer') === 'artisan';

        // Different validation for artisan vs buyer
        if ($isArtisan) {
            $request->validate([
                'first_name' => 'required_without:name|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'name' => 'required_without:first_name|string|max:255',
                'shop_name' => ['required', 'string', 'max:30', Rule::unique('users', 'shop_name')],
                'password' => 'required|string|min:8|confirmed',
                'terms' => 'accepted',
            ]);
        } else {
            $request->validate([
                'first_name' => 'required_without:name|string|max:255',
                'last_name' => 'nullable|string|max:255',
                'name' => 'required_without:first_name|string|max:255',
                'password' => 'required|string|min:8|confirmed',
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
            'name' => $name['name'],
            'first_name' => $name['first_name'],
            'last_name' => $name['last_name'],
            'email' => $socialData['email'],
            'password' => Hash::make($request->password),
            'role' => $isArtisan ? 'artisan' : 'buyer',
            'social_provider' => $socialData['provider'],
            'social_id' => $socialData['id'],
            'avatar' => $socialData['avatar'],
            'email_verified_at' => now(), // Auto-verify social users
        ];

        if ($isArtisan) {
            $userData['shop_name'] = $request->shop_name;
        }

        $user = User::create($userData);

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

        return redirect()->to($authRedirectService->pathForVerifiedUser($user));
    }
}
