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
                if ($user->isApproved()) {
                    // Backfill compliance agreement for existing approved artisans
                    rescue(fn () => $user->complianceAgreements()->updateOrCreate(
                        ['document_type' => 'seller_terms'],
                        [
                            'accepted_at' => $user->setup_completed_at ?? now(),
                            'ip_address' => $request->ip(),
                            'user_agent' => $request->userAgent(),
                        ]
                    ));
                } else {
                    if ($request->expectsJson() && !$request->inertia()) {
                        abort(403, 'Compliance agreement required. You must accept the Seller Agreement terms.');
                    }
                    return redirect()->route('artisan.setup')->with('error', 'Please accept the Seller Agreement terms to proceed.');
                }
            }
        }

        return $next($request);
    }
}
