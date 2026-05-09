<?php

namespace App\Http\Middleware;

use App\Support\NotificationPresenter;
use App\Services\SellerEntitlementService;
use App\Services\StaffAttendanceService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Session; // <--- Import Session
use Inertia\Inertia;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    protected $rootView = 'app';

    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    public function share(Request $request): array
    {
        // Calculate total quantity from the Session Cart
        $cart = Session::get('cart', []);
        $cartCount = (int) array_sum(array_column($cart, 'qty'));

        $user = $request->user();

        // 1. CACHE THE GLOBAL ANNOUNCEMENT (Expensive conditional query)
        $globalAnnouncement = Cache::remember('global_announcement_' . ($user?->role ?? 'guest'), 600, function () use ($user) {
            $announcementQuery = \App\Models\SystemAnnouncement::where('is_active', true)
                ->where(function ($query) {
                    $query->whereNull('starts_at')->orWhere('starts_at', '<=', now());
                })
                ->where(function ($query) {
                    $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
                });

            $userRole = $user?->role;
            if ($userRole) {
                $announcementQuery->where(function ($query) use ($userRole) {
                    $query->where('target_audience', 'all');
                    if (in_array($userRole, ['artisan', 'staff'])) {
                        $query->orWhere('target_audience', 'artisans');
                    } elseif ($userRole === 'buyer') {
                        $query->orWhere('target_audience', 'buyers');
                    } elseif ($userRole === 'super_admin') {
                        $query->orWhere('target_audience', 'artisans')
                              ->orWhere('target_audience', 'buyers');
                    }
                });
            } else {
                $announcementQuery->where('target_audience', 'all');
            }

            return $announcementQuery->latest()->first();
        });

        // 2. PREPARE HEAVY PROPS AS LAZY (Only loaded when explicitly requested by Inertia)
        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? $user->only(['id', 'name', 'email', 'role', 'shop_name', 'shop_slug', 'avatar_url', 'artisan_status']) : null,
                'isStaff' => $user?->isStaff() ?? false,
                'effectiveSellerId' => $user?->getEffectiveSellerId(),
                'requiresPasswordChange' => $user?->requiresStaffPasswordChange() ?? false,
            ],
            'sellerSubscription' => $user ? app(SellerEntitlementService::class)->getSubscriptionPayload($user) : null,
            'sellerSidebar' => $user ? $user->getSellerSidebarEntitlements() : null,
            'attendance' => $user?->isStaff()
                ? app(StaffAttendanceService::class)->buildLogoutContext($user)
                : null,
            
            // Global Variables
            'cartCount' => $cartCount,
            'globalAnnouncement' => $globalAnnouncement,
            'isImpersonating' => Session::has('impersonator_id'),
            
            // LAZY LOADED: Notifications and Admin counts (reduces TTFB on every route)
            'notifications' => Inertia::lazy(fn () => $user ? $user->notifications()->take(10)->get()->map(fn ($n) => NotificationPresenter::present($n, $user)) : []),
            'unreadNotificationCount' => Inertia::lazy(fn () => $user ? $user->unreadNotifications()->count() : 0),
            'unreadMessageCount' => Inertia::lazy(fn () => $user ? \App\Models\Message::where('receiver_id', $user->id)->where('is_read', false)->count() : 0),
            'pendingArtisanCount' => Inertia::lazy(fn () => $user && $user->role === 'super_admin' 
                ? \App\Models\User::where('role', 'artisan')->where('artisan_status', 'pending')->whereNotNull('setup_completed_at')->count() 
                : 0),
            
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
