<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\PersonName;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;
use Throwable;

class RegisteredUserController extends Controller
{
    /**
     * Display the registration view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Register');
    }

    /**
     * Handle an incoming registration request.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'first_name' => 'required_without:name|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'name' => 'required_without:first_name|string|max:255',
            'email' => 'required|string|lowercase|email|max:255|unique:'.User::class,
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
            'shop_name' => 'nullable|string|max:255',
            'terms' => 'accepted', // <--- CRITICAL: Enforces terms acceptance on server
        ]);

        $name = PersonName::normalize(
            $request->input('first_name'),
            $request->input('last_name'),
            $request->input('name'),
        );

        $role = $request->filled('shop_name') ? 'artisan' : 'buyer';

        $user = User::create([
            ...User::persistableNameAttributes($name),
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $role,
            'shop_name' => $request->shop_name,
        ]);

        Auth::login($user);
        $request->session()->regenerate();

        try {
            event(new Registered($user));
        } catch (Throwable $exception) {
            Log::error('Registration verification code email failed to send.', [
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
