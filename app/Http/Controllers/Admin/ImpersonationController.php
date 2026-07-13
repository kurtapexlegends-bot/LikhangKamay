<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

use App\Models\User;
use App\Models\PlatformActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Gate;

class ImpersonationController extends Controller
{
    /**
     * Start impersonating a user.
     */
    public function impersonate(User $user, Request $request)
    {
        Gate::authorize('admin-action');

        $adminId = Auth::id();

        // Security Check: Prevent impersonating other super admins or yourself
        if ($user->role === 'super_admin' || $user->id === $adminId) {
            return back()->with('error', 'Cannot impersonate another Super Admin or yourself.');
        }

        // Store the original admin ID in the session
        session(['impersonator_id' => $adminId]);

        // Log the activity
        PlatformActivity::log(
            'user_impersonation',
            "Admin started impersonating user: {$user->name} (ID: {$user->id})",
            ['target_user_id' => $user->id, 'target_user_role' => $user->role]
        );

        // Perform the login swap
        Auth::login($user);

        $targetRoute = $user->role === 'artisan' ? route('dashboard') : route('home');

        // Force a hard redirect for Inertia to prevent it from trying to refresh 
        // the current admin page with the new (restricted) session.
        if ($request->header('X-Inertia')) {
            return \Inertia\Inertia::location($targetRoute);
        }

        return redirect()->to($targetRoute);
    }

    /**
     * Stop impersonating and return to the admin account.
     */
    public function leave(Request $request)
    {
        if (!session()->has('impersonator_id')) {
            return redirect()->route('home');
        }

        $adminId = session('impersonator_id');
        $impersonatedUserId = Auth::id();

        // Forget the session flag
        session()->forget('impersonator_id');

        // Restore the admin session
        Auth::loginUsingId($adminId);

        $targetRoute = route('admin.users.manager', ['tab' => 'directory']);

        if ($request->header('X-Inertia')) {
            return \Inertia\Inertia::location($targetRoute);
        }

        return redirect()->to($targetRoute)->with('success', 'Impersonation ended. You have been returned to your Admin account.');
    }
}
