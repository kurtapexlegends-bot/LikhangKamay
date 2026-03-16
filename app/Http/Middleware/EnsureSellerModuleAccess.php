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

        if (!$user || !$user->isArtisan()) {
            abort(403, 'Unauthorized action. Artisan access only.');
        }

        if (empty($modules)) {
            abort(403, 'Missing seller module access rule.');
        }

        foreach ($modules as $module) {
            if ($user->canAccessSellerModule($module)) {
                return $next($request);
            }
        }

        abort(403, 'Your current plan does not include this module.');
    }
}

