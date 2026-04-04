<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\PersonName;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Inertia\Inertia;
use Inertia\Response;

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

        event(new Registered($user));

        return redirect()->route('login')->with('status', 'Account created! Please log in.');
    }
}
