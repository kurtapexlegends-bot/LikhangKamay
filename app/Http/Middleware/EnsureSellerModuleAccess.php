<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSellerModuleAccess
{
    /**
     * @param  array<int, string>  $modules
     */
    public function handle(Request $request, Closure $next, string ...$modules): Response
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if ($user && $user->isArtisan() && $user->isPendingApproval()) {
            return redirect()->route('artisan.pending');
        }

        if (!$user || !$user->canAccessSellerWorkspace()) {
            abort(403, 'Unauthorized action. Seller workspace access only.');
        }

        if (empty($modules)) {
            abort(403, 'Missing seller module access rule.');
        }

        foreach ($modules as $module) {
            if (!$user->canAccessSellerModule($module)) {
                continue;
            }

            if ($request->isMethodSafe() || $user->canEditSellerModule($module)) {
                return $next($request);
            }
        }

        if (!$request->isMethodSafe()) {
            abort(403, 'This capability is read-only for your account.');
        }

        abort(403, 'Your current plan does not include this module.');
    }
}
