<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\StaffAttendanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

class StaffSecurityController extends Controller
{
    public function home(Request $request): Response|RedirectResponse
    {
        $user = $this->getStaffUser($request);

        if (!$user->hasCompletedStaffSecurityGate()) {
            if (!$user->hasVerifiedEmail()) {
                return redirect()->route('verification.notice');
            }

            return redirect()->route('staff.password.edit');
        }

        $user->loadMissing('sellerOwner');

        return Inertia::render('Staff/Holding', [
            'staffAccount' => [
                'name' => $user->name,
                'email' => $user->email,
                'role_preset_key' => $user->staff_role_preset_key,
                'workspace_access_enabled' => $user->isWorkspaceAccessEnabled(),
                'plan_workspace_suspended' => $user->isPlanWorkspaceSuspended(),
            ],
            'sellerOwner' => [
                'id' => $user->getEffectiveSellerId(),
                'name' => $user->sellerOwner?->shop_name ?? $user->sellerOwner?->name,
            ],
        ]);
    }

    public function editPassword(Request $request): Response|RedirectResponse
    {
        $user = $this->getStaffUser($request);

        if (!$user->hasVerifiedEmail()) {
            return redirect()->route('verification.notice');
        }

        if (!$user->requiresStaffPasswordChange()) {
            return redirect()->route('staff.home');
        }

        return Inertia::render('Auth/StaffForcePasswordChange');
    }

    public function confirmLogout(Request $request, StaffAttendanceService $attendanceService): Response|RedirectResponse
    {
        $user = $this->getStaffUser($request);

        if ($user->canAccessSellerWorkspace()) {
            return redirect()->route('staff.dashboard');
        }

        return Inertia::render('Auth/StaffLogoutChoice', [
            'attendance' => $attendanceService->buildLogoutContext($user),
        ]);
    }

    public function showResumePrompt(Request $request, StaffAttendanceService $attendanceService): Response|RedirectResponse
    {
        $user = $this->getStaffUser($request);

        if (!$user->canAccessSellerWorkspace()) {
            return redirect()->route('staff.home');
        }

        if (!$attendanceService->requiresResumePrompt($user)) {
            return redirect()->route('staff.dashboard');
        }

        return Inertia::render('Auth/StaffResumePrompt', [
            'resumePrompt' => $attendanceService->buildResumeContext($user),
        ]);
    }

    public function resumeAttendance(Request $request, StaffAttendanceService $attendanceService): RedirectResponse
    {
        $user = $this->getStaffUser($request);

        abort_unless($user->canAccessSellerWorkspace(), 403, 'Staff workspace access only.');

        $attendanceService->ensureClockedIn($user);

        $intended = $request->session()->pull('staff.attendance.intended');

        if (is_string($intended) && $intended !== '') {
            return redirect()->to($intended);
        }

        return $this->redirectToWorkspaceReferrer($request);
    }

    public function pauseAttendance(Request $request, StaffAttendanceService $attendanceService): RedirectResponse
    {
        $user = $this->getStaffUser($request);

        abort_unless($user->canAccessSellerWorkspace(), 403, 'Staff workspace access only.');

        $attendanceService->closeOpenSession($user, StaffAttendanceService::MODE_PAUSED);

        return redirect()->route('staff.dashboard');
    }

    public function heartbeat(Request $request, StaffAttendanceService $attendanceService): JsonResponse
    {
        $user = $this->getStaffUser($request);

        if ($attendanceService->requiresResumePrompt($user)) {
            return response()->json([
                'requires_resume' => true,
                'resume_prompt' => $attendanceService->buildResumeContext($user),
            ], 423);
        }

        $session = $attendanceService->touchHeartbeat($user);

        return response()->json([
            'ok' => true,
            'active' => (bool) $session,
            'last_heartbeat_at' => $session?->last_heartbeat_at?->toIso8601String(),
        ]);
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $user = $this->getStaffUser($request);

        if (!$user->hasVerifiedEmail()) {
            return redirect()->route('verification.notice');
        }

        if (!$user->requiresStaffPasswordChange()) {
            return redirect()->route('staff.home');
        }

        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', Password::defaults(), 'confirmed'],
        ]);

        $user->update([
            'password' => Hash::make($validated['password']),
            'must_change_password' => false,
        ]);

        return redirect()
            ->route('staff.dashboard')
            ->with('success', 'Password updated successfully.');
    }

    protected function redirectToWorkspaceReferrer(Request $request): RedirectResponse
    {
        $referer = $request->headers->get('referer');
        $fallback = route('staff.dashboard');

        if (!is_string($referer) || $referer === '') {
            return redirect()->to($fallback);
        }

        $parts = parse_url($referer);

        if (!is_array($parts)) {
            return redirect()->to($fallback);
        }

        $path = $parts['path'] ?? '';

        if ($path === '' || str_contains($path, '/staff/attendance/resume')) {
            return redirect()->to($fallback);
        }

        if (isset($parts['query']) && $parts['query'] !== '') {
            $path .= '?' . $parts['query'];
        }

        return redirect()->to($path);
    }

    protected function getStaffUser(Request $request): \App\Models\User
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        abort_unless($user && $user->isStaff(), 403, 'Staff access only.');

        return $user;
    }
}
