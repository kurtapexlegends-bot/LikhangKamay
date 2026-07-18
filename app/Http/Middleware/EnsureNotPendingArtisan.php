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

            if ($user->isArtisan() && !$user->isApproved()) {
                if ($request->isMethod('get')) {
                    if ($user->setup_completed_at === null || $user->isRejected()) {
                        return redirect()->route('artisan.setup');
                    }
                    return redirect()->route('artisan.pending');
                }

                abort(403, 'Your account is not approved to perform this action.');
            }
        }

        return $next($request);
    }
}
