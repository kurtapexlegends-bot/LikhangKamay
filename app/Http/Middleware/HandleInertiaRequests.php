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

    public function handle(Request $request, \Closure $next)
    {
        $response = parent::handle($request, $next);

        if ($response instanceof \Symfony\Component\HttpFoundation\Response) {
            $response->headers->set('Cache-Control', 'no-cache, no-store, must-revalidate');
            $response->headers->set('Pragma', 'no-cache');
            $response->headers->set('Expires', '0');
        }

        return $response;
    }

    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? $user->only(['id', 'name', 'first_name', 'last_name', 'email', 'role', 'shop_name', 'shop_slug', 'avatar', 'avatar_url', 'artisan_status', 'premium_tier']) : null,
                'isStaff' => $user?->isStaff() ?? false,
                'effectiveSellerId' => $user?->getEffectiveSellerId(),
                'requiresPasswordChange' => $user?->requiresStaffPasswordChange() ?? false,
                'hasAcceptedCompliance' => $user ? ($user->isArtisan() ? $user->hasAcceptedComplianceTerms('seller_terms') : true) : true,
            ],
            
            // Lazy load subscription and sidebar to reduce DB overhead
            // Evaluate core metadata on initial visit for test compatibility
            'sellerSubscription' => fn () => $user ? app(SellerEntitlementService::class)->getSubscriptionPayload($user) : null,
            'sellerSidebar' => fn () => $user ? $user->getSellerSidebarEntitlements() : null,
            'attendance' => fn () => ($user && $user->isStaff()) ? app(StaffAttendanceService::class)->buildLogoutContext($user) : null,
            
            // Cart count from session - lightweight but still good to keep accessible
            'cartCount' => fn () => (int) array_sum(array_column(Session::get('cart', []), 'qty')),
            
            // Global Announcement with Cache
            'globalAnnouncement' => Inertia::lazy(fn () => $this->getGlobalAnnouncement($user)),
            
            'isImpersonating' => fn () => Session::has('impersonator_id'),
            
            // LAZY LOADED: Notifications and Admin counts (reduces TTFB on every route)
            'notifications' => Inertia::lazy(fn () => $user ? $user->getNotificationsQuery()->latest()->take(10)->get()->map(fn ($n) => NotificationPresenter::present($n, $user)) : []),
            'unreadNotificationCount' => Inertia::lazy(fn () => $user ? $user->getUnreadNotificationsQuery()->count() : 0),
            'unreadMessageCount' => Inertia::lazy(fn () => $user ? \App\Models\Message::where('receiver_id', $user->id)->whereRaw('is_read = false')->count() : 0),
            'pendingArtisanCount' => Inertia::lazy(fn () => $user && $user->role === 'super_admin' 
                ? \App\Models\User::where('role', 'artisan')->where('artisan_status', 'pending')->whereNotNull('setup_completed_at')->count() 
                : 0),
            
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
            ],
            
            // Platform branding via Settings Facade (Cached)
            'platform' => [
                'name' => \App\Facades\Settings::get('platform_name', 'LikhangKamay'),
                'logo' => \App\Facades\Settings::get('platform_logo', '/images/logo.png'),
                'favicon' => \App\Facades\Settings::get('favicon', '/favicon.ico'),
                'primaryColor' => \App\Facades\Settings::get('primary_color', '#8B4513'),
                'seo' => \App\Facades\Settings::get('seo_metadata', [
                    'title' => 'Likhang Kamay | Artisan Marketplace',
                    'description' => 'A premium marketplace for Filipino artisans and handmade crafts.',
                    'keywords' => 'artisan, handmade, crafts, philippines, marketplace',
                ]),
                'contact' => \App\Facades\Settings::get('contact_info', [
                    'email' => 'support@likhangkamay.app',
                    'phone' => '',
                    'address' => '',
                ]),
                'socials' => \App\Facades\Settings::get('social_links', [
                    'facebook' => '',
                    'instagram' => '',
                    'twitter' => '',
                ]),
            ],
        ];
    }

    /**
     * Helper to resolve global announcement with caching
     */
    private function getGlobalAnnouncement(?\App\Models\User $user)
    {
        try {
            return Cache::remember('global_announcement_' . ($user?->role ?? 'guest'), 600, function () use ($user) {
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
        } catch (\Exception $e) {
            report($e);
            return null;
        }
    }
}
