<?php

namespace App\Http\Middleware;

use App\Models\StaffAttendanceSession;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnforceSingleDeviceSession
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->current_session_id) {
            $currentSessionId = $request->session()->getId();

            if ($user->current_session_id !== $currentSessionId) {
                // If staff member has an active shift running during takeover, pause it and log alert
                if ($user->isStaff()) {
                    $activeSession = StaffAttendanceSession::where('staff_user_id', $user->id)
                        ->whereNull('clock_out_at')
                        ->where('status', 'active')
                        ->latest()
                        ->first();

                    if ($activeSession) {
                        $activeSession->update([
                            'status' => 'paused',
                            'paused_at' => now(),
                            'pause_reason' => 'Suspicious Multi-Device Access: Account logged in on another device',
                        ]);
                    }
                }

                // Invalidate current session and log out
                Auth::guard('web')->logout();
                $request->session()->invalidate();
                $request->session()->regenerateToken();

                if ($request->wantsJson() || $request->header('X-Inertia')) {
                    return response()->json([
                        'message' => 'Your account was logged in from another device. For security, only one active session per account is permitted.',
                        'requires_login' => true,
                    ], 423);
                }

                return redirect()->route('login')->with('warning', 'Your account was logged in from another device. Only one device per account is permitted.');
            }
        }

        return $next($request);
    }
}
