<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    protected function redirectPathForVerifiedUser(\App\Models\User $user): string
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

        return '/shop';
    }

    /**
     * Display the email verification prompt.
     */
    public function __invoke(Request $request): RedirectResponse|Response
    {
        return $request->user()->hasVerifiedEmail()
                    ? redirect()->intended($this->redirectPathForVerifiedUser($request->user()))
                    : Inertia::render('Auth/VerifyEmail', ['status' => session('status')]);
    }
}
