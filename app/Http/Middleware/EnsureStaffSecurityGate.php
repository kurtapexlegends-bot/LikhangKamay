<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureStaffSecurityGate
{
    /**
     * Routes a staff account can access before verification is completed.
     *
     * @var array<int, string>
     */
    protected array $verificationRoutes = [
        'verification.notice',
        'verification.verify',
        'verification.send',
        'staff.attendance.resume-prompt',
        'staff.attendance.resume',
        'staff.attendance.break',
        'staff.attendance.heartbeat',
        'staff.logout.direct',
        'staff.logout.confirm',
        'staff.logout',
        'logout',
    ];

    /**
     * Routes a verified staff account can access while changing the default password.
     *
     * @var array<int, string>
     */
    protected array $passwordChangeRoutes = [
        'staff.password.edit',
        'staff.password.update',
        'staff.attendance.resume-prompt',
        'staff.attendance.resume',
        'staff.attendance.break',
        'staff.attendance.heartbeat',
        'staff.logout.direct',
        'staff.logout.confirm',
        'staff.logout',
        'logout',
    ];

    /**
     * Routes a fully-initialized staff account can access in Phase 1.
     *
     * @var array<int, string>
     */
    protected array $holdingRoutes = [
        'staff.home',
        'staff.attendance.resume-prompt',
        'staff.attendance.resume',
        'staff.attendance.break',
        'staff.attendance.heartbeat',
        'staff.logout.direct',
        'staff.logout.confirm',
        'staff.logout',
        'logout',
    ];

    /**
     * Protected route prefixes staff can access after security setup is complete.
     *
     * @var array<int, string>
     */
    protected array $completedRoutePrefixes = [
        'staff.dashboard',
        'team-messages.',
        'profile.',
        'notifications.',
        'chat.',
        'orders.',
        'analytics.',
        'products.',
        'seller.wallet.',
        '3d.',
        'shop.settings',
        'reviews.',
        'hr.',
        'procurement.',
        'supplies.',
        'stock-requests.',
        'accounting.',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if (!$user || !$user->isStaff()) {
            return $next($request);
        }

        $routeName = $request->route()?->getName();

        if (!$user->hasVerifiedEmail()) {
            if (in_array($routeName, $this->verificationRoutes, true)) {
                return $next($request);
            }

            return redirect()->route('verification.notice');
        }

        if ($user->requiresStaffPasswordChange()) {
            if (in_array($routeName, $this->passwordChangeRoutes, true)) {
                return $next($request);
            }

            return redirect()->route('staff.password.edit');
        }

        if ($this->isCompletedRouteAllowed($routeName)) {
            return $next($request);
        }

        return redirect()->route('staff.home');
    }

    protected function isCompletedRouteAllowed(?string $routeName): bool
    {
        if (!$routeName) {
            return false;
        }

        if (
            $routeName === 'dashboard'
            || $routeName === 'staff.dashboard'
            || in_array($routeName, $this->holdingRoutes, true)
        ) {
            return true;
        }

        foreach ($this->completedRoutePrefixes as $prefix) {
            if (str_starts_with($routeName, $prefix)) {
                return true;
            }
        }

        return false;
    }
}
