<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;

class EmailVerificationCodeService
{
    public const STATUS_VERIFIED = 'verified';
    public const STATUS_INVALID = 'invalid';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_MISSING = 'missing';
    public const STATUS_TOO_MANY_ATTEMPTS = 'too_many_attempts';

    public const RESEND_COOLDOWN_SECONDS = 60;
    public const MAX_ATTEMPTS = 5;

    public function issue(User $user): array
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
        $expiresAt = now()->addMinutes((int) config('auth.verification.expire', 60));

        $user->forceFill([
            'email_verification_code_hash' => Hash::make($code),
            'email_verification_code_expires_at' => $expiresAt,
            'email_verification_code_sent_at' => now(),
            'email_verification_code_attempts' => 0,
        ])->save();

        return [$code, $expiresAt];
    }

    public function clear(User $user): void
    {
        $user->forceFill([
            'email_verification_code_hash' => null,
            'email_verification_code_expires_at' => null,
            'email_verification_code_sent_at' => null,
            'email_verification_code_attempts' => 0,
        ])->save();
    }

    public function verify(User $user, string $code): string
    {
        if (
            !is_string($user->email_verification_code_hash)
            || $user->email_verification_code_hash === ''
            || !$user->email_verification_code_expires_at
        ) {
            return self::STATUS_MISSING;
        }

        if ($user->email_verification_code_expires_at->isPast()) {
            $this->clear($user);

            return self::STATUS_EXPIRED;
        }

        if ((int) $user->email_verification_code_attempts >= self::MAX_ATTEMPTS) {
            $this->clear($user);

            return self::STATUS_TOO_MANY_ATTEMPTS;
        }

        if (!Hash::check($code, $user->email_verification_code_hash)) {
            $attempts = ((int) $user->email_verification_code_attempts) + 1;

            $user->forceFill([
                'email_verification_code_attempts' => $attempts,
            ])->save();

            if ($attempts >= self::MAX_ATTEMPTS) {
                $this->clear($user);

                return self::STATUS_TOO_MANY_ATTEMPTS;
            }

            return self::STATUS_INVALID;
        }

        return self::STATUS_VERIFIED;
    }

    public function canResend(User $user): bool
    {
        return $this->secondsUntilResendAvailable($user) === 0;
    }

    public function hasActiveCode(User $user): bool
    {
        return is_string($user->email_verification_code_hash)
            && $user->email_verification_code_hash !== ''
            && $user->email_verification_code_expires_at instanceof Carbon
            && $user->email_verification_code_expires_at->isFuture();
    }

    public function secondsUntilResendAvailable(User $user): int
    {
        if (!$user->email_verification_code_sent_at instanceof Carbon) {
            return 0;
        }

        $availableAt = $user->email_verification_code_sent_at->copy()->addSeconds(self::RESEND_COOLDOWN_SECONDS);

        if ($availableAt->isPast()) {
            return 0;
        }

        return now()->diffInSeconds($availableAt);
    }
}
