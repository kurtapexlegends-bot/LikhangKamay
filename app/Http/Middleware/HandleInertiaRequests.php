<?php

namespace App\Http\Middleware;

use App\Services\SellerEntitlementService;
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
        
        if ($request->user()) {
            $notifications = $request->user()->notifications()
                ->take(10)
                ->get()
                ->map(function ($notification) {
                    return [
                        'id' => $notification->id,
                        'type' => $notification->data['type'] ?? 'general',
                        'title' => $notification->data['title'] ?? 'Notification',
                        'message' => $notification->data['message'] ?? '',
                        'reason' => $notification->data['reason'] ?? null,
                        'request_type' => $notification->data['request_type'] ?? null,
                        'request_id' => $notification->data['request_id'] ?? null,
                        'url' => $notification->data['url'] ?? null,
                        'read_at' => $notification->read_at,
                        'created_at' => $notification->created_at->diffForHumans(),
                    ];
                });
            $unreadNotificationCount = $request->user()->unreadNotifications()->count();
        }

        $user = $request->user();
        $sellerSidebar = $user?->getSellerSidebarEntitlements();
        $sellerSubscription = app(SellerEntitlementService::class)->getSubscriptionPayload($user);

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
            // Global Variables for Frontend
            'cartCount' => $cartCount,
            'notifications' => $notifications,
            'unreadNotificationCount' => $unreadNotificationCount,
            'pendingArtisanCount' => $request->user() && $request->user()->role === 'super_admin' 
                ? \App\Models\User::where('role', 'artisan')->where('artisan_status', 'pending')->count() 
                : 0,
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
        ];
    }
}
