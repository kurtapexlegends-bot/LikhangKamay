<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\StaffAttendanceService;
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

    public function confirmLogout(Request $request, StaffAttendanceService $attendanceService): Response
    {
        $user = $this->getStaffUser($request);

        return Inertia::render('Auth/StaffLogoutChoice', [
            'attendance' => $attendanceService->buildLogoutContext($user),
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

        $routeName = $user->fresh()->getFirstAccessibleSellerRouteName();

        return redirect()
            ->route($routeName ?: 'staff.home')
            ->with('success', 'Password updated successfully.');
    }

    protected function getStaffUser(Request $request): \App\Models\User
    {
        /** @var \App\Models\User $user */
        $user = $request->user();

        abort_unless($user && $user->isStaff(), 403, 'Staff access only.');

        return $user;
    }
}
