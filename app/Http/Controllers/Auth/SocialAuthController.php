<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
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

    /**
     * Redirect to OAuth provider (for buyers)
     */
    public function redirect(string $provider)
    {
        if (!in_array($provider, $this->providers)) {
            return redirect()->route('login')->with('error', 'Unsupported provider.');
        }

        // Store that this is a buyer registration
        session(['social_auth_role' => 'buyer']);

        return Socialite::driver($provider)->redirect();
    }

    /**
     * Redirect to OAuth provider (for artisans)
     */
    public function redirectArtisan(string $provider)
    {
        if (!in_array($provider, $this->providers)) {
            return redirect()->route('login')->with('error', 'Unsupported provider.');
        }

        // Store that this is an artisan registration
        session(['social_auth_role' => 'artisan']);

        return Socialite::driver($provider)->redirect();
    }

    /**
     * Handle OAuth callback
     */
    public function callback(string $provider)
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

            Auth::login($existingUser, true);
            
            // Redirect based on their actual role
            if ($existingUser->isAdmin()) {
                return redirect()->route('admin.dashboard');
            }
            
            if ($existingUser->isArtisan()) {
                if ($existingUser->isApproved()) {
                    return redirect()->route('dashboard');
                }
                return redirect()->route('artisan.setup');
            }
            
            return redirect()->intended('/');
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

        return Inertia::render('Auth/CompleteProfile', [
            'email' => $socialData['email'],
            'suggestedName' => $socialData['name'],
            'provider' => $socialData['provider'],
            'isArtisan' => $isArtisan,
        ]);
    }

    /**
     * Complete profile and create user account
     */
    public function completeProfile(Request $request)
    {
        $socialData = session('social_auth');

        if (!$socialData) {
            return redirect()->route('login')->with('error', 'Session expired. Please try again.');
        }

        $isArtisan = ($socialData['role'] ?? 'buyer') === 'artisan';

        // Different validation for artisan vs buyer
        if ($isArtisan) {
            $request->validate([
                'name' => 'required|string|max:255',
                'shop_name' => ['required', 'string', 'max:30', Rule::unique('users', 'shop_name')],
                'password' => 'required|string|min:8|confirmed',
            ]);
        } else {
            $request->validate([
                'name' => 'required|string|max:255',
                'password' => 'required|string|min:8|confirmed',
            ]);
        }

        // Create user with appropriate role
        $userData = [
            'name' => $request->name,
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
        session()->forget('social_auth');
        session()->forget('social_auth_role');

        // Fire registered event and login
        event(new Registered($user));
        Auth::login($user, true);

        // Redirect based on role
        if ($isArtisan) {
            return redirect()->route('artisan.setup');
        }

        return redirect('/');
    }
}
