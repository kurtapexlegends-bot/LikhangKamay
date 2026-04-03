<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\AuthRedirectService;
use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class VerifyEmailController extends Controller
{
    public function __invoke(Request $request, AuthRedirectService $authRedirectService): RedirectResponse|Response
    {
        $user = User::findOrFail($request->route('id'));

        abort_unless(
            hash_equals((string) $request->route('hash'), sha1($user->getEmailForVerification())),
            403,
            'This action is unauthorized.'
        );

        if (!$user->hasVerifiedEmail() && $user->markEmailAsVerified()) {
            event(new Verified($user));
        }

        if ($request->user()?->is($user)) {
            return redirect()->intended(
                $authRedirectService->pathForVerifiedUser($user).'?verified=1'
            );
        }

        return Inertia::render('Auth/VerificationResult', [
            'status' => $this->verificationStatusMessage($user),
            'loginEmail' => $user->email,
            'isStaffAccount' => $user->isStaff(),
            'signedInAsDifferentUser' => (bool) ($request->user() && !$request->user()->is($user)),
            'currentUser' => $request->user() ? [
                'name' => $request->user()->name,
                'role' => $request->user()->role,
            ] : null,
        ]);
    }

    protected function verificationStatusMessage(User $user): string
    {
        if ($user->isStaff()) {
            return 'Email verified successfully. Sign in with the staff account to continue.';
        }

        return 'Email verified successfully. Sign in to continue.';
    }
}
