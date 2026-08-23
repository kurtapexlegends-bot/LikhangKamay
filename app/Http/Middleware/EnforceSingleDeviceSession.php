<?php

namespace App\Http\Middleware;

use App\Services\StaffAttendanceService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnforceSingleDeviceSession
{
    public function __construct(
        protected StaffAttendanceService $attendanceService
    ) {}

    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (app()->environment('local')) {
            return $next($request);
        }

        $user = $request->user();

        if ($user && $user->current_session_id) {
            $currentSessionId = $request->session()->getId();

            if ($user->current_session_id !== $currentSessionId) {
                // If staff member has an active shift running during takeover, pause it and log alert
                if ($user->isStaff()) {
                    try {
                        $this->attendanceService->closeOpenSession(
                            $user,
                            StaffAttendanceService::MODE_PAUSED,
                            'Suspicious Multi-Device Access: Account logged in on another device'
                        );
                    } catch (\Throwable $e) {
                        report($e);
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
