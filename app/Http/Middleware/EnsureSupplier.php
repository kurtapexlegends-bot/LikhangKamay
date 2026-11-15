<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

class EnsureSupplier
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        /** @var \App\Models\User|null $user */
        $user = Auth::user();

        if (!$user || !$user->isSupplier()) {
            abort(403, 'Unauthorized. Dedicated supplier access only.');
        }

        // Uncompleted setup must go to supplier setup
        if (is_null($user->setup_completed_at)) {
            if ($request->routeIs('supplier.setup') || $request->routeIs('supplier.setup.store')) {
                return $next($request);
            }

            return redirect()->route('supplier.setup');
        }

        // Rejected suppliers can access setup or pending to revise and resubmit
        if ($user->artisan_status === 'rejected') {
            if ($request->routeIs('supplier.setup') || $request->routeIs('supplier.setup.store') || $request->routeIs('supplier.pending')) {
                return $next($request);
            }

            return redirect()->route('supplier.pending');
        }

        // Pending unapproved suppliers can only access pending screen
        if (!$user->isApproved()) {
            if ($request->routeIs('supplier.pending')) {
                return $next($request);
            }

            return redirect()->route('supplier.pending');
        }

        // Approved suppliers visiting setup or pending get redirected to dashboard
        if ($request->routeIs('supplier.setup') || $request->routeIs('supplier.pending')) {
            return redirect()->route('supplier.dashboard');
        }

        return $next($request);
    }
}
