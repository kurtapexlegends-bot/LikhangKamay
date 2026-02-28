<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Inertia\Response;

class AuthenticatedSessionController extends Controller
{
    /**
     * Display the login view.
     */
    public function create(): Response
    {
        return Inertia::render('Auth/Login', [
            'canResetPassword' => Route::has('password.request'),
            'status' => session('status'),
        ]);
    }

    /**
     * Handle an incoming authentication request.
     */
    public function store(LoginRequest $request): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        $user = $request->user();

        // Role-based redirects after login
        
        // Super Admin → Admin Dashboard
        if ($user->role === 'super_admin') {
            return redirect()->route('admin.dashboard');
        }
        
        // Artisan → Check their status
        if ($user->role === 'artisan') {
            // Not completed setup yet
            if (is_null($user->setup_completed_at)) {
                return redirect()->route('artisan.setup');
            }
            
            // Pending approval
            if ($user->artisan_status === 'pending') {
                return redirect()->route('artisan.pending');
            }
            
            // Rejected → can resubmit
            if ($user->artisan_status === 'rejected') {
                return redirect()->route('artisan.setup');
            }
            
            // Approved → Seller dashboard
            return redirect()->route('dashboard');
        }

        // Buyers → Shop/Homepage
        return redirect('/shop');
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
