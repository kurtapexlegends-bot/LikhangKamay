<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Services\StaffAttendanceService;

class TrackStaffActivity
{
    public function __construct(
        protected StaffAttendanceService $attendanceService
    ) {
    }

    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        try {
            if (Auth::check()) {
                /** @var \App\Models\User $user */
                $user = Auth::user();
                if ($user instanceof \App\Models\User && $user->isStaff()) {
                    // Update last_activity_at only on mutating actions (POST, PUT, PATCH, DELETE)
                    if (in_array(strtoupper($request->method()), ['POST', 'PUT', 'PATCH', 'DELETE'])) {
                        $openSession = $this->attendanceService->getOpenSession($user);
                        if ($openSession) {
                            $openSession->update([
                                'last_activity_at' => now(config('app.timezone')),
                            ]);
                        }
                    }
                }
            }
        } catch (\Exception $e) {
            // Silently fail to keep the app running even if DB is unstable
        }

        return $response;
    }
}
