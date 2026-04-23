<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthRedirectService;
use App\Services\EmailVerificationCodeService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class EmailVerificationPromptController extends Controller
{
    /**
     * Display the email verification prompt.
     */
    public function __invoke(
        Request $request,
        AuthRedirectService $authRedirectService,
        EmailVerificationCodeService $emailVerificationCodeService
    ): RedirectResponse|Response
    {
        $user = $request->user();

        return $request->user()->hasVerifiedEmail()
                    ? redirect()->intended($authRedirectService->pathForVerifiedUser($request->user()))
                    : Inertia::render('Auth/VerifyEmail', [
                        'status' => session('status'),
                        'verification' => [
                            'email' => $user->email,
                            'hasActiveCode' => $emailVerificationCodeService->hasActiveCode($user),
                            'expiresAt' => $user->email_verification_code_expires_at?->toIso8601String(),
                            'canResend' => $emailVerificationCodeService->canResend($user),
                            'resendAvailableInSeconds' => $emailVerificationCodeService->secondsUntilResendAvailable($user),
                        ],
                    ]);
    }
}
