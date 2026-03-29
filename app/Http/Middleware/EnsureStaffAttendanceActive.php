<?php

namespace App\Http\Middleware;

use App\Services\StaffAttendanceService;
use Closure;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaffAttendanceActive
{
    public function __construct(
        protected StaffAttendanceService $attendanceService
    ) {
    }

    public function handle(Request $request, Closure $next): Response
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if (
            !$user
            || !$user->isStaff()
            || !$user->hasCompletedStaffSecurityGate()
            || !$user->canAccessSellerWorkspace()
        ) {
            return $next($request);
        }

        if (!$this->attendanceService->requiresResumePrompt($user)) {
            return $next($request);
        }

        if ($request->isMethod('GET')) {
            $request->session()->put('staff.attendance.intended', $request->fullUrl());
        }

        $resumeContext = $this->attendanceService->buildResumeContext($user);
        $promptRoute = route('staff.attendance.resume-prompt');

        if ($request->header('X-Inertia')) {
            return Inertia::location($promptRoute);
        }

        if ($request->expectsJson() || $request->ajax()) {
            return response()->json([
                'requires_resume' => true,
                'redirect_to' => $promptRoute,
                'resume_prompt' => $resumeContext,
            ], 423);
        }

        return redirect()->to($promptRoute);
    }
}
