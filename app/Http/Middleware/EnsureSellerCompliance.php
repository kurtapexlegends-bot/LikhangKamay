<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSellerCompliance
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        // Only enforce for sellers/artisans
        if ($user && $user->isArtisan()) {
            if (!$user->hasAcceptedComplianceTerms('seller_terms')) {
                if ($request->expectsJson() || $request->inertia()) {
                    abort(403, 'Compliance agreement required. You must accept the Seller Agreement terms.');
                }
                return redirect()->route('artisan.setup')->with('error', 'Please accept the Seller Agreement terms to proceed.');
            }
        }

        return $next($request);
    }
}
