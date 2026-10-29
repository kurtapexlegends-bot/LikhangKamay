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
                'user' => $user ? array_merge(
                    $user->only([
                        'id', 'name', 'first_name', 'last_name', 'email', 'email_verified_at', 'role', 'staff_role_preset_key',
                        'shop_name', 'shop_slug', 'bio', 'avatar', 'avatar_url', 'banner_image', 'banner_image_url',
                        'artisan_status', 'artisan_rejection_reason', 'premium_tier', 'payout_method',
                        'payout_account_name', 'approved_at', 'artisan_welcomed',
                        'street_address', 'saved_address', 'barangay', 'city', 'region', 'zip_code', 'phone_number',
                        'is_vat_registered', 'tin',
                    ]),
                    [
                        'has_payout_account' => !empty($user->payout_account_number),
                        'has_business_permit' => !empty($user->business_permit),
                        'has_dti_registration' => !empty($user->dti_registration),
                        'has_valid_id' => !empty($user->valid_id),
                        'has_tin_id' => !empty($user->tin_id),
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
            
            // LAZY LOADED: Notifications list (only loaded when requested/dropdown is opened)
            'notifications' => Inertia::lazy(fn () => $user ? rescue(fn () => NotificationPresenter::presentCollection($user->getNotificationsQuery()->latest()->take(10)->get(), $user), [], false) : []),
            
            // Shared counts evaluated on initial page load (micro-cached to prevent DB query spam on rapid navigation)
            'unreadNotificationCount' => fn () => $user ? rescue(fn () => Cache::remember("user_{$user->id}_unread_notif_count", 10, fn () => $user->getUnreadNotificationsQuery()->count()), 0, false) : 0,
            'unreadMessageCount' => fn () => $user ? rescue(fn () => Cache::remember("user_{$user->id}_unread_msg_count", 10, fn () => \App\Models\Message::where('receiver_id', $user->id)->where('is_read', \App\Casts\PostgresCompatibleBoolean::dbVal(false))->count()), 0, false) : 0,
            'pendingArtisanCount' => fn () => $user && $user->role === 'super_admin' 
                ? rescue(fn () => Cache::remember('admin_pending_artisan_count', 15, fn () => \App\Models\User::where('role', 'artisan')->where('artisan_status', 'pending')->whereNotNull('setup_completed_at')->count()), 0, false) 
                : 0,
            'pendingComplianceCount' => fn () => $user && $user->role === 'super_admin'
                ? rescue(fn () => Cache::remember('admin_pending_compliance_count', 15, fn () => \App\Models\FlaggedContent::where('status', 'pending')->count() + \App\Models\ReviewDispute::whereIn('status', ['pending', 'under_review'])->count()), 0, false)
                : 0,
            'activeDisputesCount' => fn () => $user && $user->role === 'super_admin'
                ? rescue(fn () => Cache::remember('admin_active_disputes_count', 15, fn () => \App\Models\Dispute::where('status', 'escalated')->count()), 0, false)
                : 0,
            'pendingApprovalsCount' => fn () => $user ? rescue(function () use ($user) {
                $seller = $user->getEffectiveSeller();
                if (!$seller || !$seller->isArtisan()) {
                    return 0;
                }
                if (!$seller->canManageStaff() && !$seller->isPremiumTier()) {
                    return 0;
                }
                if ($user->isStaff() && !$user->canEditSellerModule('overview') && !$user->isStaffManager()) {
                    return 0;
                }
                return Cache::remember("seller_{$seller->id}_pending_approvals_count", 15, fn () => app(\App\Services\OwnerApprovalService::class)->getPendingCount($seller));
            }, 0, false) : 0,
            
            'flash' => [
                'success' => fn () => $request->session()->get('success'),
                'error' => fn () => $request->session()->get('error'),
                'warning' => fn () => $request->session()->get('warning'),
                'status' => fn () => $request->session()->get('status'),
            ],
            
            // Platform branding via Settings Facade (Cached)
            'platform' => [
                'name' => \App\Facades\Settings::get('platform_name', 'LikhangKamay'),
                'logo' => \App\Services\StorageUrl::url(\App\Facades\Settings::get('platform_logo'), '/images/logo.png'),
                'favicon' => \App\Services\StorageUrl::url(\App\Facades\Settings::get('favicon'), '/favicon.ico'),
                'primaryColor' => \App\Facades\Settings::get('primary_color', '#8B4513'),
                'seo' => \App\Facades\Settings::get('seo_metadata', [
                    'title' => 'LikhangKamay | Artisan Marketplace',
                    'description' => 'A premium marketplace for Filipino artisans and handmade crafts.',
                    'keywords' => 'artisan, handmade, crafts, philippines, marketplace',
                ]),
                'contact' => \App\Facades\Settings::get('contact_info', [
                    'email' => 'likhangkamaybusiness@gmail.com',
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
