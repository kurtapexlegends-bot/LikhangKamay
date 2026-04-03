<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Services\AuthRedirectService;
use App\Services\StaffAttendanceService;
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
    public function store(LoginRequest $request, AuthRedirectService $authRedirectService): RedirectResponse
    {
        $request->authenticate();

        $request->session()->regenerate();

        /** @var \App\Models\User $user */
        $user = $request->user();

        return $authRedirectService->redirectAfterLogin($user);
    }

    public function destroyStaff(Request $request, StaffAttendanceService $attendanceService): RedirectResponse
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        abort_unless($user && $user->isStaff(), 403, 'Staff access only.');

        $validated = $request->validate([
            'action' => ['required', 'in:pause,clock_out'],
        ]);

        $attendanceService->closeOpenSession(
            $user,
            $validated['action'] === 'pause'
                ? StaffAttendanceService::MODE_PAUSED
                : StaffAttendanceService::MODE_CLOCKED_OUT
        );

        return $this->destroy($request);
    }

    /**
     * Destroy an authenticated session.
     */
    public function destroy(Request $request): RedirectResponse
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if ($user?->isStaff() && $request->routeIs('logout')) {
            return redirect()->route('staff.logout.confirm');
        }

        Auth::guard('web')->logout();

        $request->session()->forget([
            'social_auth',
            'social_auth_role',
            'social_auth_remember',
        ]);

        $request->session()->invalidate();

        $request->session()->regenerateToken();

        return redirect('/');
    }
}
