<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Validation\Rules\Password;

class PasswordRules
{
    /**
     * Get password validation rules for general consumers / buyers.
     */
    public static function buyer(): Password
    {
        return Password::min(8);
    }

    /**
     * Get password validation rules for business, artisan, staff, and admin accounts.
     */
    public static function business(): Password
    {
        $rule = Password::min(12);

        return app()->isProduction()
            ? $rule->letters()->mixedCase()->numbers()->symbols()->uncompromised()
            : $rule;
    }

    /**
     * Resolve the appropriate password rule for a given user role.
     */
    public static function forRole(?string $role = null): Password
    {
        return in_array($role, ['artisan', 'staff', 'admin', 'super_admin'], true)
            ? self::business()
            : self::buyer();
    }

    /**
     * Resolve the appropriate password rule for a user instance.
     */
    public static function forUser(?User $user = null): Password
    {
        if (!$user) {
            return self::buyer();
        }

        return !$user->isBuyer()
            ? self::business()
            : self::buyer();
    }
}
