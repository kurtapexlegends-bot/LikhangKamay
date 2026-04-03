<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\RedirectResponse;

class AuthRedirectService
{
    public function __construct(
        protected StaffAttendanceService $attendanceService
    ) {
    }

    public function redirectAfterLogin(User $user): RedirectResponse
    {
        if ($user->isAdmin()) {
            if (!$user->hasVerifiedEmail()) {
                return redirect()->route('verification.notice');
            }

            return redirect()->route('admin.dashboard');
        }

        if ($user->isStaff()) {
            $this->attendanceService->ensureClockedIn($user);

            if (!$user->hasVerifiedEmail()) {
                return redirect()->route('verification.notice');
            }

            if ($user->requiresStaffPasswordChange()) {
                return redirect()->route('staff.password.edit');
            }

            $routeName = $user->getFirstAccessibleSellerRouteName();

            return $routeName
                ? redirect()->route($routeName)
                : redirect()->route('staff.home');
        }

        if (!$user->hasVerifiedEmail()) {
            return redirect()->route('verification.notice');
        }

        return $user->isArtisan()
            ? redirect()->to($this->pathForVerifiedUser($user))
            : redirect()->intended($this->pathForVerifiedUser($user));
    }

    public function pathForVerifiedUser(User $user): string
    {
        if ($user->isAdmin()) {
            return route('admin.dashboard', absolute: false);
        }

        if ($user->isStaff()) {
            if ($user->requiresStaffPasswordChange()) {
                return route('staff.password.edit', absolute: false);
            }

            $routeName = $user->getFirstAccessibleSellerRouteName();

            return $routeName
                ? route($routeName, absolute: false)
                : route('staff.home', absolute: false);
        }

        if ($user->isArtisan()) {
            if (is_null($user->setup_completed_at) || $user->artisan_status === 'rejected') {
                return route('artisan.setup', absolute: false);
            }

            if ($user->artisan_status === 'pending') {
                return route('artisan.pending', absolute: false);
            }

            return route('dashboard', absolute: false);
        }

        return '/';
    }
}
