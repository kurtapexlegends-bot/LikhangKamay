<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Support\Facades\Auth;

class EnsureNotPendingArtisan
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (Auth::check()) {
            /** @var \App\Models\User $user */
            $user = Auth::user();

            if ($user->isArtisan() && $user->isPendingApproval()) {
                if ($request->expectsJson() || $request->header('X-Inertia')) {
                    abort(403, 'Your account is pending admin approval.');
                }
                return redirect()->route('artisan.pending');
            }
        }

        return $next($request);
    }
}
