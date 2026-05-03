<?php

namespace App\Http\Middleware;

use App\Support\NotificationPresenter;
use App\Services\SellerEntitlementService;
use App\Services\StaffAttendanceService;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Illuminate\Support\Facades\Session; // <--- Import Session

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
        $cartCount = array_sum(array_column($cart, 'qty'));

        // Get user notifications if authenticated
        $notifications = [];
        $unreadNotificationCount = 0;
        $unreadMessageCount = 0;
        
        if ($request->user()) {
            $notifications = $request->user()->notifications()
                ->take(10)
                ->get()
                ->map(fn ($notification) => NotificationPresenter::present($notification, $request->user()));
            $unreadNotificationCount = $request->user()->unreadNotifications()->count();
            $unreadMessageCount = \App\Models\Message::where('receiver_id', $request->user()->id)->where('is_read', false)->count();
        }

        $user = $request->user();
        $sellerSidebar = $user?->getSellerSidebarEntitlements();
        $sellerSubscription = app(SellerEntitlementService::class)->getSubscriptionPayload($user);
        $attendance = $user?->isStaff()
            ? app(StaffAttendanceService::class)->buildLogoutContext($user)
            : null;

        $announcementQuery = \App\Models\SystemAnnouncement::where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('starts_at')->orWhere('starts_at', '<=', now());
            })
            ->where(function ($query) {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            });

        // Filter by target audience
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
            // Guest users only see 'all' audience
            $announcementQuery->where('target_audience', 'all');
        }

        $globalAnnouncement = $announcementQuery->latest()->first();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'isStaff' => $user?->isStaff() ?? false,
                'effectiveSellerId' => $user?->getEffectiveSellerId(),
                'requiresPasswordChange' => $user?->requiresStaffPasswordChange() ?? false,
            ],
            'sellerSubscription' => $sellerSubscription,
            'sellerSidebar' => $sellerSidebar,
            'attendance' => $attendance,
            // Global Variables for Frontend
            'cartCount' => $cartCount,
            'notifications' => $notifications,
            'unreadNotificationCount' => $unreadNotificationCount,
            'unreadMessageCount' => $unreadMessageCount,
            'globalAnnouncement' => $globalAnnouncement,
            'isImpersonating' => Session::has('impersonator_id'),
            'pendingArtisanCount' => $request->user() && $request->user()->role === 'super_admin' 
                ? \App\Models\User::where('role', 'artisan')->where('artisan_status', 'pending')->whereNotNull('setup_completed_at')->count() 
                : 0,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
