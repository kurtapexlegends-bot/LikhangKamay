<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\PlatformActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ImpersonationController extends Controller
{
    /**
     * Start impersonating a user.
     */
    public function impersonate(User $user, Request $request)
    {
        // Security Check: Only super admins can initiate impersonation
        if (Auth::user()->role !== 'super_admin') {
            abort(403, 'Unauthorized to impersonate users.');
        }

        $adminId = Auth::id();

        // Security Check: Prevent impersonating other super admins or yourself
        if ($user->role === 'super_admin' || $user->id === $adminId) {
            return back()->with('error', 'Cannot impersonate another Super Admin or yourself.');
        }

        // Store the original admin ID in the session
        session(['impersonator_id' => $adminId]);

        // Log the security event
        PlatformActivity::create([
            'user_id' => $adminId,
            'action' => 'impersonation_started',
            'description' => 'Admin initiated support impersonation for user ID ' . $user->id,
            'metadata' => ['target_user_id' => $user->id]
        ]);

        // Perform the login swap
        Auth::login($user);

        // Redirect based on the target user's role
        if ($user->role === 'artisan') {
            return redirect()->route('dashboard');
        }

        return redirect()->route('home');
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

        // Log the return
        PlatformActivity::create([
            'user_id' => $adminId,
            'action' => 'impersonation_ended',
            'description' => 'Admin ended support impersonation of user ID ' . $impersonatedUserId,
            'metadata' => ['target_user_id' => $impersonatedUserId]
        ]);

        return redirect()->route('admin.users')->with('success', 'Impersonation ended. You have been returned to your Admin account.');
    }
}
