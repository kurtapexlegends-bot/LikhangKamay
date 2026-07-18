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
        /** @var \Illuminate\Filesystem\FilesystemAdapter|null $storage */
        $storage = null;
        try {
            $storage = \Illuminate\Support\Facades\Storage::disk('public');
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Failed to resolve public storage disk in HandleInertiaRequests: ' . $e->getMessage());
        }

        $urlHelper = function (?string $path) use ($storage) {
            if (!$path) {
                return null;
            }
            try {
                if ($storage) {
                    return $storage->url($path);
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning('Failed to generate URL for path ' . $path . ': ' . $e->getMessage());
            }
            return asset('storage/' . $path);
        };

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user ? array_merge(
                    $user->only(['id', 'name', 'first_name', 'last_name', 'email', 'role', 'shop_name', 'shop_slug', 'avatar', 'avatar_url', 'banner_image', 'banner_image_url', 'artisan_status', 'premium_tier']),
                    [
                        'business_permit' => $user->business_permit,
                        'business_permit_url' => $urlHelper($user->business_permit),
                        'dti_registration' => $user->dti_registration,
                        'dti_registration_url' => $urlHelper($user->dti_registration),
                        'valid_id' => $user->valid_id,
                        'valid_id_url' => $urlHelper($user->valid_id),
                        'tin_id' => $user->tin_id,
                        'tin_id_url' => $urlHelper($user->tin_id),
                    ]
                ) : null,
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
            
            'isImpersonating' => fn () => Session::has('impersonator_id'),
            
            // LAZY LOADED: Notifications list (only loaded when requested/dropdown is opened)
            'notifications' => Inertia::lazy(fn () => $user ? $user->getNotificationsQuery()->latest()->take(10)->get()->map(fn ($n) => NotificationPresenter::present($n, $user)) : []),
            
            // Shared counts evaluated on initial page load (for real-time headers/sidebar)
            'unreadNotificationCount' => fn () => $user ? $user->getUnreadNotificationsQuery()->count() : 0,
            'unreadMessageCount' => fn () => $user ? \App\Models\Message::where('receiver_id', $user->id)->whereRaw('is_read = false')->count() : 0,
            'pendingArtisanCount' => fn () => $user && $user->role === 'super_admin' 
                ? \App\Models\User::where('role', 'artisan')->where('artisan_status', 'pending')->whereNotNull('setup_completed_at')->count() 
                : 0,
            
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
                    'title' => 'LikhangKamay | Artisan Marketplace',
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
}
