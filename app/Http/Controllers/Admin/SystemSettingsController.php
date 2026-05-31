<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SponsorshipRequest;
use App\Models\UserTierLog;
use App\Services\SystemSettingsService;
use App\Services\Admin\AdminMetricsService;
use App\Services\Admin\AdminAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;

class SystemSettingsController extends Controller
{
    protected SystemSettingsService $settings;
    protected AdminMetricsService $metrics;
    protected AdminAnalyticsService $analytics;

    public function __construct(
        SystemSettingsService $settings,
        AdminMetricsService $metrics,
        AdminAnalyticsService $analytics
    ) {
        $this->settings = $settings;
        $this->metrics = $metrics;
        $this->analytics = $analytics;
    }

    public function index()
    {
        try {
            $systemSettings = [
                'platform_name' => $this->settings->get('platform_name', 'Likhang Kamay'),
                'platform_logo' => $this->settings->get('platform_logo'),
                'favicon' => $this->settings->get('favicon'),
                'primary_color' => $this->settings->get('primary_color', '#8B4513'),
                'seo_metadata' => $this->settings->get('seo_metadata', [
                    'title' => 'Likhang Kamay | Artisan Marketplace',
                    'description' => 'A premium marketplace for Filipino artisans and handmade crafts.',
                    'keywords' => 'artisan, handmade, crafts, philippines, marketplace',
                ]),
                'contact_info' => $this->settings->get('contact_info', [
                    'email' => 'support@likhangkamay.app',
                    'phone' => '',
                    'address' => '',
                ]),
                'social_links' => $this->settings->get('social_links', [
                    'facebook' => '',
                    'instagram' => '',
                    'twitter' => '',
                ]),
                // Operational Settings
                'commission_rate' => $this->settings->get('commission_rate', 5.0),
                'convenience_fee' => $this->settings->get('convenience_fee', 15.0),
                'withdrawal_min' => $this->settings->get('withdrawal_min', 500.0),
                'maintenance_mode' => $this->settings->get('maintenance_mode', false),
                'paymongo_enabled' => $this->settings->get('paymongo_enabled', true),

                // SMTP Settings
                'mail_host' => $this->settings->get('mail_host', 'smtp.mailtrap.io'),
                'mail_port' => $this->settings->get('mail_port', '2525'),
                'mail_encryption' => $this->settings->get('mail_encryption', 'tls'),
                'mail_username' => $this->settings->get('mail_username', ''),
                'mail_password' => $this->settings->get('mail_password', ''),
                'mail_from_address' => $this->settings->get('mail_from_address', 'noreply@likhangkamay.app'),
                'mail_from_name' => $this->settings->get('mail_from_name', 'Likhang Kamay'),
            ];

            $premiumPrice = 199;
            $elitePrice = 399;

            $premiumUsersCount = User::where('role', 'artisan')->where('premium_tier', 'premium')->count();
            $eliteUsersCount = User::where('role', 'artisan')->where('premium_tier', 'super_premium')->count();
            $freeUsersCount = User::where('role', 'artisan')->where(function($q) {
                $q->where('premium_tier', 'free')->orWhereNull('premium_tier');
            })->count();

            $projectedMrr = ($premiumUsersCount * $premiumPrice) + ($eliteUsersCount * $elitePrice);
            $previousPremiumUsersCount = $this->metrics->getHistoricalTierCount('premium', 30);
            $previousEliteUsersCount = $this->metrics->getHistoricalTierCount('super_premium', 30);
            $previousProjectedMrr = ($previousPremiumUsersCount * $premiumPrice) + ($previousEliteUsersCount * $elitePrice);

            $mrrGrowth = 0;
            if ($previousProjectedMrr > 0) {
                $mrrGrowth = (($projectedMrr - $previousProjectedMrr) / $previousProjectedMrr) * 100;
            } elseif ($projectedMrr > 0) {
                $mrrGrowth = 100;
            }

            $mrrMetric = [
                'value' => $projectedMrr,
                'growth' => round($mrrGrowth, 1),
                'trend' => $mrrGrowth > 0 ? 'up' : ($mrrGrowth < 0 ? 'down' : 'neutral'),
                'is_projected' => true,
                'basis' => 'Based on current active artisan plan tiers.',
            ];

            $activeSponsorships = SponsorshipRequest::where('status', 'approved')->count();
            $pendingSponsorships = SponsorshipRequest::where('status', 'pending')->count();
            $previousActiveSponsorships = SponsorshipRequest::where('status', 'approved')
                ->where('approved_at', '<', now()->subDays(30))
                ->count();
            
            $sponsorshipGrowth = 0;
            if ($previousActiveSponsorships > 0) {
                $sponsorshipGrowth = (($activeSponsorships - $previousActiveSponsorships) / $previousActiveSponsorships) * 100;
            } elseif ($activeSponsorships > 0) {
                $sponsorshipGrowth = 100;
            }

            $sponsorshipMetric = [
                'value' => $activeSponsorships,
                'growth' => round($sponsorshipGrowth, 1),
                'trend' => $sponsorshipGrowth > 0 ? 'up' : ($sponsorshipGrowth < 0 ? 'down' : 'neutral')
            ];

            $monetizationMetrics = [
                'mrr' => $mrrMetric,
                'sponsorships' => $sponsorshipMetric,
                'subscribers' => [
                    'free' => $freeUsersCount,
                    'premium' => $premiumUsersCount,
                    'elite' => $eliteUsersCount,
                    'total_paid' => $premiumUsersCount + $eliteUsersCount,
                ],
                'pendingSponsorships' => $pendingSponsorships,
            ];

            $recentSubscribers = UserTierLog::query()
                ->with('user:id,name,shop_name,avatar,premium_tier')
                ->whereNotNull('new_tier')
                ->latest()
                ->limit(5)
                ->get()
                ->map(function($log) {
                    $user = $log->user;
                    if (!$user) return null;

                    $formatTierLabel = fn (?string $tier) => match ($tier) {
                        'super_premium' => 'Elite',
                        'premium' => 'Premium',
                        'free', null, '' => 'Free',
                        default => ucfirst(str_replace('_', ' ', (string) $tier)),
                    };

                    $newTierLabel = $formatTierLabel($log->new_tier);
                    $previousTierLabel = $formatTierLabel($log->previous_tier);
                    $changeDirection = match ([$log->previous_tier, $log->new_tier]) {
                        ['premium', 'super_premium'], ['free', 'premium'], ['free', 'super_premium'], [null, 'premium'], [null, 'super_premium'] => 'upgrade',
                        ['super_premium', 'premium'], ['premium', 'free'], ['super_premium', 'free'] => 'downgrade',
                        default => 'change',
                    };

                    return [
                        'id' => $log->id,
                        'user_id' => $user->id,
                        'name' => $user->name,
                        'shop_name' => $user->shop_name,
                        'avatar' => $user->avatar,
                        'premium_tier' => $log->new_tier,
                        'previous_tier' => $log->previous_tier,
                        'previous_tier_label' => $previousTierLabel,
                        'tier' => $newTierLabel,
                        'change_label' => "{$previousTierLabel} to {$newTierLabel}",
                        'change_direction' => $changeDirection,
                        'date' => $log->created_at->format('M d, Y h:i A'),
                    ];
                })
                ->filter()
                ->values();

            $recentSponsorships = Inertia::defer(function() {
                return SponsorshipRequest::with(['user:id,name,shop_name,avatar,premium_tier', 'product:id,name'])
                    ->orderBy('created_at', 'desc')
                    ->limit(5)
                    ->get()
                    ->map(function($req) {
                        return [
                            'id' => $req->id,
                            'user' => $req->user,
                            'product_name' => $req->product->name ?? 'Unknown Product',
                            'status' => $req->status,
                            'date' => $req->created_at->format('M d, Y h:i A')
                        ];
                    });
            });

            return Inertia::render('Admin/Layout/SystemConfig', [
                'settings' => $systemSettings,
                'metrics' => $monetizationMetrics,
                'recentSubscribers' => $recentSubscribers,
                'recentSponsorships' => $recentSponsorships,
            ]);
        } catch (\Throwable $e) {
            Log::error("SystemSettings index error: " . $e->getMessage());
            return Inertia::render('Admin/Layout/SystemConfig', [
                'settings' => [
                    'platform_name' => 'Likhang Kamay',
                    'platform_logo' => null,
                    'favicon' => null,
                    'primary_color' => '#8B4513',
                    'seo_metadata' => ['title' => '', 'description' => '', 'keywords' => ''],
                    'contact_info' => ['email' => '', 'phone' => '', 'address' => ''],
                    'social_links' => ['facebook' => '', 'instagram' => '', 'twitter' => ''],
                    'commission_rate' => 5.0,
                    'convenience_fee' => 15.0,
                    'withdrawal_min' => 500.0,
                    'maintenance_mode' => false,
                    'paymongo_enabled' => true,
                    'mail_host' => 'smtp.mailtrap.io',
                    'mail_port' => '2525',
                    'mail_encryption' => 'tls',
                    'mail_username' => '',
                    'mail_password' => '',
                    'mail_from_address' => 'noreply@likhangkamay.app',
                    'mail_from_name' => 'Likhang Kamay',
                ],
                'metrics' => [
                    'mrr' => ['value' => 0, 'growth' => 0, 'trend' => 'neutral'],
                    'sponsorships' => ['value' => 0, 'growth' => 0, 'trend' => 'neutral'],
                    'subscribers' => ['free' => 0, 'premium' => 0, 'elite' => 0, 'total_paid' => 0],
                    'pendingSponsorships' => 0,
                ],
                'recentSubscribers' => [],
                'recentSponsorships' => [],
                'db_error' => true
            ]);
        }
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'platform_name' => 'required|string|max:255',
            'platform_logo' => 'nullable|image|max:2048',
            'favicon' => 'nullable|file|mimes:ico,png|max:512',
            'primary_color' => ['required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
            'seo_metadata' => 'required|array',
            'seo_metadata.title' => 'required|string|max:255',
            'seo_metadata.description' => 'required|string|max:500',
            'seo_metadata.keywords' => 'nullable|string|max:255',
            'contact_info' => 'required|array',
            'contact_info.email' => 'required|email|max:255',
            'contact_info.phone' => 'nullable|string|max:50',
            'contact_info.address' => 'nullable|string|max:500',
            'social_links' => 'required|array',
            'social_links.facebook' => 'nullable|url|max:255',
            'social_links.instagram' => 'nullable|url|max:255',
            'social_links.twitter' => 'nullable|url|max:255',
            // Operational Validation
            'commission_rate' => 'required|numeric|min:0|max:100',
            'convenience_fee' => 'required|numeric|min:0',
            'withdrawal_min' => 'required|numeric|min:0',
            'maintenance_mode' => 'required|boolean',
            'paymongo_enabled' => 'required|boolean',

            // SMTP Validation
            'mail_host' => 'nullable|string|max:255',
            'mail_port' => 'nullable|string|max:10',
            'mail_encryption' => 'nullable|string|max:20',
            'mail_username' => 'nullable|string|max:255',
            'mail_password' => 'nullable|string|max:255',
            'mail_from_address' => 'nullable|email|max:255',
            'mail_from_name' => 'nullable|string|max:255',
        ]);

        // Audit Logging for critical changes
        if ($this->settings->get('primary_color') !== $validated['primary_color']) {
            \App\Models\PlatformActivity::log(
                'BRANDING_UPDATE',
                "Updated primary brand color from " . $this->settings->get('primary_color') . " to " . $validated['primary_color']
            );
        }

        if ((float)$this->settings->get('commission_rate') !== (float)$validated['commission_rate']) {
            \App\Models\PlatformActivity::log(
                'COMMISSION_UPDATE',
                "Changed site-wide commission from " . $this->settings->get('commission_rate') . "% to " . $validated['commission_rate'] . "%"
            );
        }

        if ((bool)$this->settings->get('maintenance_mode') !== (bool)$validated['maintenance_mode']) {
            $status = $validated['maintenance_mode'] ? 'ENABLED' : 'DISABLED';
            \App\Models\PlatformActivity::log(
                'MAINTENANCE_TOGGLE',
                "Maintenance mode was {$status} by the administrator."
            );
        }

        if ((bool)$this->settings->get('paymongo_enabled') !== (bool)$validated['paymongo_enabled']) {
            $status = $validated['paymongo_enabled'] ? 'ONLINE' : 'OFFLINE';
            \App\Models\PlatformActivity::log(
                'GATEWAY_STATUS_CHANGE',
                "PayMongo gateway status changed to {$status}."
            );
        }

        $this->settings->set('platform_name', $validated['platform_name']);
        $this->settings->set('primary_color', $validated['primary_color']);
        $this->settings->set('seo_metadata', $validated['seo_metadata'], 'json');
        $this->settings->set('contact_info', $validated['contact_info'], 'json');
        $this->settings->set('social_links', $validated['social_links'], 'json');
        
        // Save Operational Settings
        $this->settings->set('commission_rate', $validated['commission_rate'], 'float');
        $this->settings->set('convenience_fee', $validated['convenience_fee'], 'float');
        $this->settings->set('withdrawal_min', $validated['withdrawal_min'], 'float');
        $this->settings->set('maintenance_mode', $validated['maintenance_mode'] ? 'true' : 'false', 'boolean');
        $this->settings->set('paymongo_enabled', $validated['paymongo_enabled'] ? 'true' : 'false', 'boolean');

        // Save SMTP Config
        $this->settings->set('mail_host', $validated['mail_host'] ?? '');
        $this->settings->set('mail_port', $validated['mail_port'] ?? '');
        $this->settings->set('mail_encryption', $validated['mail_encryption'] ?? '');
        $this->settings->set('mail_username', $validated['mail_username'] ?? '');
        $this->settings->set('mail_password', $validated['mail_password'] ?? '');
        $this->settings->set('mail_from_address', $validated['mail_from_address'] ?? '');
        $this->settings->set('mail_from_name', $validated['mail_from_name'] ?? '');

        if ($request->hasFile('platform_logo')) {
            $path = $request->file('platform_logo')->store('platform', 'public');
            $this->settings->set('platform_logo', Storage::url($path));
        }

        if ($request->hasFile('favicon')) {
            $path = $request->file('favicon')->store('platform', 'public');
            $this->settings->set('favicon', Storage::url($path));
        }

        return back()->with('success', 'System settings synchronized successfully.');
    }
}

