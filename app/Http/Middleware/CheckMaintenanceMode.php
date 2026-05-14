<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use App\Facades\Settings;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $maintenanceEnabled = Settings::get('maintenance_mode', false);

        if ($maintenanceEnabled) {
            $user = $request->user();

            // Allow Super Admins to bypass maintenance mode
            if ($user && $user->role === 'super_admin') {
                return $next($request);
            }

            // Also allow the settings update route itself, otherwise admins can't turn it off!
            if ($request->routeIs('admin.settings.*') || $request->routeIs('login') || $request->routeIs('logout')) {
                return $next($request);
            }

            // Abort or render maintenance page
            if ($request->expectsJson() || $request->header('X-Inertia')) {
                return Inertia::render('Maintenance')->toResponse($request)->setStatusCode(503);
            }

            return response()->view('maintenance', [], 503);
        }

        return $next($request);
    }
}
