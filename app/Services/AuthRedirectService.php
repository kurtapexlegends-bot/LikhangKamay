<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Str;

class AuthRedirectService
{
    public function redirectAfterLogin(User $user): RedirectResponse
    {
        if ($user->isAdmin()) {
            session()->forget('url.intended');

            if (!$user->hasVerifiedEmail()) {
                return redirect()->route('verification.notice');
            }

            return redirect()->route('admin.dashboard');
        }

        if ($user->isStaff()) {
            session()->forget('url.intended');

            if (!$user->hasVerifiedEmail()) {
                return redirect()->route('verification.notice');
            }

            if ($user->requiresStaffPasswordChange()) {
                return redirect()->route('staff.password.edit');
            }

            return redirect()->route('staff.dashboard');
        }

        if (!$user->hasVerifiedEmail()) {
            return redirect()->route('verification.notice');
        }

        if ($user->isArtisan()) {
            session()->forget('url.intended');

            if (is_null($user->setup_completed_at) || $user->artisan_status === 'rejected') {
                return redirect()->route('artisan.setup');
            }

            if ($user->artisan_status === 'pending') {
                return redirect()->route('artisan.pending');
            }

            return redirect()->route('dashboard');
        }

        return $this->redirectToIntendedOrRoute($user, '/');
    }

    public function redirectToIntendedOrRoute(User $user, string $defaultRouteOrPath): RedirectResponse
    {
        $intended = session()->get('url.intended');

        if ($intended && $this->isSafeIntendedUrlForUser($user, (string) $intended)) {
            session()->forget('url.intended');
            return redirect()->to($intended);
        }

        // Clear invalid or unauthorized intended URL
        session()->forget('url.intended');

        return Str::startsWith($defaultRouteOrPath, '/')
            ? redirect()->to($defaultRouteOrPath)
            : redirect()->route($defaultRouteOrPath);
    }

    public function isSafeIntendedUrlForUser(User $user, string $url): bool
    {
        $path = parse_url($url, PHP_URL_PATH) ?? $url;

        // If user is a Buyer:
        if ($user->isBuyer()) {
            $restrictedBuyerPrefixes = [
                '/admin',
                '/dashboard',
                '/staff',
                '/procurement',
                '/hr',
                '/payroll',
                '/analytics',
                '/performance',
                '/sponsorships',
                '/shop-settings',
                '/shop-locations',
                '/subscription',
                '/3d-manager',
                '/audit-log',
                '/team-messages',
                '/payout-manager',
                '/fund-release',
                '/system-config',
                '/artisan',
            ];

            foreach ($restrictedBuyerPrefixes as $prefix) {
                if ($path === $prefix || Str::startsWith($path, $prefix . '/')) {
                    return false;
                }
            }

            // Exclude seller product & order management paths:
            // Notice: /products (management index) vs /product/{slug} (public buyer details)
            if ($path === '/products' || Str::startsWith($path, '/products/')) {
                return false;
            }

            if ($path === '/orders' || Str::startsWith($path, '/orders/')) {
                return false;
            }

            if ($path === '/discounts' || Str::startsWith($path, '/discounts/')) {
                return false;
            }

            return true;
        }

        // If user is an Artisan:
        if ($user->isArtisan()) {
            if (Str::startsWith($path, '/admin')) {
                return false;
            }

            return true;
        }

        // If user is Staff:
        if ($user->isStaff()) {
            if (Str::startsWith($path, '/admin')) {
                return false;
            }

            return true;
        }

        // If user is Admin:
        if ($user->isAdmin()) {
            return true;
        }

        return false;
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

        return '/';
    }
}
