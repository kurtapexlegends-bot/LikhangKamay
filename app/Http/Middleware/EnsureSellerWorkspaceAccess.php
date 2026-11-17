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

        if ($user && $user->isArtisan() && !$user->isApproved()) {
            if ($user->setup_completed_at === null || $user->isRejected()) {
                return redirect()->route('artisan.setup');
            }
            return redirect()->route('artisan.pending');
        }

        if ($user) {
            if ($user->isArtisan()) {
                if ($user->isApproved() && $user->setup_completed_at === null) {
                    $user->update([
                        'setup_completed_at' => $user->approved_at ?? $user->created_at ?? now(),
                    ]);
                }
                $user->enforceSubscriptionExpirationIfDue();
            } elseif ($user->isStaff() && $user->sellerOwner) {
                if ($user->sellerOwner->enforceSubscriptionExpirationIfDue()) {
                    $user->refresh();
                }
            }
        }

        if ($user && $user->isSupplier()) {
            return redirect()->route('supplier.dashboard');
        }

        $routeName = $request->route()?->getName();

        // 1. Artisan Paywall Gating: If subscription is expired or inactive, allow ONLY subscription checkout routes
        if ($user && $user->isArtisan() && $user->isApproved()) {
            if (!$user->hasActiveSubscription()) {
                $allowedSubscriptionRoutes = [
                    'seller.subscription',
                    'seller.subscription.upgrade',
                    'seller.subscription.payment.success',
                    'seller.subscription.payment.cancel',
                    'logout',
                ];

                if (!in_array($routeName, $allowedSubscriptionRoutes, true)) {
                    return redirect()->route('seller.subscription');
                }

                return $next($request);
            }
        }

        // 2. Staff Subscription Gating: If shop owner's subscription is inactive, allow ONLY lock screen & logout
        if ($user && $user->isStaff()) {
            $owner = $user->sellerOwner;
            if ($owner && !$owner->hasActiveSubscription()) {
                $allowedStaffRoutes = [
                    'staff.home',
                    'staff.subscription.locked',
                    'logout',
                    'staff.logout.confirm',
                    'staff.logout.direct',
                ];

                if (!in_array($routeName, $allowedStaffRoutes, true)) {
                    return redirect()->route('staff.subscription.locked');
                }

                return $next($request);
            }
        }

        if (!$user || !$user->canAccessSellerWorkspace()) {
            abort(403, 'Unauthorized action. Seller workspace access only.');
        }

        return $next($request);
    }
}
