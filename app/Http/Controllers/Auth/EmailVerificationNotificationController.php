<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;
use App\Services\EmailVerificationCodeService;

class EmailVerificationNotificationController extends Controller
{
    /**
     * Send a new email verification notification.
     */
    public function store(Request $request, EmailVerificationCodeService $emailVerificationCodeService): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended($this->redirectPathForVerifiedUser($request->user()));
        }

        $secondsUntilResend = $emailVerificationCodeService->secondsUntilResendAvailable($request->user());

        if ($secondsUntilResend > 0) {
            return back()->with('error', "Please wait {$secondsUntilResend} seconds before requesting another verification code.");
        }

        try {
            $request->user()->sendEmailVerificationNotification();
        } catch (Throwable $exception) {
            Log::error('Email verification resend failed.', [
                'user_id' => $request->user()?->id,
                'email' => $request->user()?->email,
                'message' => $exception->getMessage(),
            ]);

            return back()->with('error', 'Unable to send the verification code right now. Please try again later.');
        }

        return back()->with('status', 'verification-code-sent');
    }

    protected function redirectPathForVerifiedUser(\App\Models\User $user): string
    {
        if ($user->isAdmin()) {
            return route('admin.dashboard', absolute: false);
        }

        if ($user->isStaff()) {
            if ($user->requiresStaffPasswordChange()) {
                return route('staff.password.edit', absolute: false);
            }

            return route('staff.dashboard', absolute: false);
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
}
