<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthRedirectService;
use App\Services\EmailVerificationCodeService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VerifyEmailCodeController extends Controller
{
    public function store(
        Request $request,
        AuthRedirectService $authRedirectService,
        EmailVerificationCodeService $emailVerificationCodeService
    ): RedirectResponse {
        /** @var \App\Models\User $user */
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return redirect()->intended($authRedirectService->pathForVerifiedUser($user));
        }

        $validated = $request->validate([
            'code' => ['required', 'digits:6'],
        ]);

        $result = $emailVerificationCodeService->verify($user, $validated['code']);

        if ($result === EmailVerificationCodeService::STATUS_VERIFIED) {
            if (!$user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
                event(new Verified($user));
            }

            $emailVerificationCodeService->clear($user);

            return redirect()->intended(
                $authRedirectService->pathForVerifiedUser($user).'?verified=1'
            );
        }

        throw ValidationException::withMessages([
            'code' => match ($result) {
                EmailVerificationCodeService::STATUS_EXPIRED => 'This verification code has expired. Request a new code.',
                EmailVerificationCodeService::STATUS_MISSING => 'No active verification code was found. Request a new code first.',
                EmailVerificationCodeService::STATUS_TOO_MANY_ATTEMPTS => 'Too many incorrect attempts. Request a new code to continue.',
                default => 'The verification code is incorrect.',
            },
        ]);
    }
}
