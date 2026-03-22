<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSellerWorkspaceAccess
{
    public function handle(Request $request, Closure $next): Response
    {
        /** @var \App\Models\User|null $user */
        $user = $request->user();

        if (!$user || !$user->canAccessSellerWorkspace()) {
            abort(403, 'Unauthorized action. Seller workspace access only.');
        }

        return $next($request);
    }
}
