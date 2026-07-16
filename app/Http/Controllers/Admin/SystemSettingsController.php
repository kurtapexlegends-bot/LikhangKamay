<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\SponsorshipRequest;
use App\Models\UserTierLog;
use App\Models\Category;
use App\Models\Product;
use App\Models\Order;
use App\Services\SystemSettingsService;
use App\Services\Admin\AdminMetricsService;
use App\Services\Admin\AdminAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Gate;
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
        Gate::authorize('admin-action');
        try {
            $trashData = $this->getTrashQueueAndStats();
            return Inertia::render('Admin/Layout/SystemConfig/SystemConfig', [
                'settings' => $this->getSystemSettings(),
                'metrics' => $this->getMonetizationMetrics(),
                'recentSubscribers' => $this->getRecentSubscribers(),
                'recentSponsorships' => Inertia::defer(function() {
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
                }),
                'categories' => Category::withCount('products')->orderBy('name')->get(),
                'trashQueue' => $trashData['queue'],
                'trashStats' => $trashData['stats'],
            ]);
        } catch (\Throwable $e) {
            Log::error("SystemSettings index error: " . $e->getMessage());
            return Inertia::render('Admin/Layout/SystemConfig/SystemConfig', [
                'settings' => [
                    'platform_name' => 'LikhangKamay',
                    'platform_logo' => null,
                    'favicon' => null,
                    'primary_color' => '#8B4513',
                    'seo_metadata' => ['title' => '', 'description' => '', 'keywords' => ''],
                    'contact_info' => ['email' => '', 'phone' => '', 'address' => ''],
                    'social_links' => ['facebook' => '', 'indigo_avatar' => '', 'twitter' => ''],
                    'commission_rate' => 5.0,
                    'convenience_fee' => 3.0,
                    'maintenance_mode' => false,
                    'paymongo_enabled' => true,
                    'mail_host' => 'smtp.mailtrap.io',
                    'mail_port' => '2525',
                    'mail_encryption' => 'tls',
                    'mail_username' => '',
                    'mail_password' => '',
                    'mail_from_address' => 'noreply@likhangkamay.app',
                    'mail_from_name' => 'LikhangKamay',
                ],
                'metrics' => [
                    'mrr' => ['value' => 0, 'growth' => 0, 'trend' => 'neutral'],
                    'sponsorships' => ['value' => 0, 'growth' => 0, 'trend' => 'neutral'],
                    'platform_fees' => ['value' => 0, 'growth' => 0, 'trend' => 'neutral'],
                    'subscribers' => ['free' => 0, 'premium' => 0, 'elite' => 0, 'total_paid' => 0],
                    'pendingSponsorships' => 0,
                ],
                'recentSubscribers' => [],
                'recentSponsorships' => [],
                'categories' => [],
                'trashQueue' => [],
                'trashStats' => ['totalItems' => 0, 'products' => 0, 'categories' => 0, 'orders' => 0],
                'db_error' => true
            ]);
        }
    }

    public function exportMonetization()
    {
        Gate::authorize('admin-action');

        $metrics = $this->getMonetizationMetrics();
        $recentSubscribers = $this->getRecentSubscribers();
        $sponsorshipRequests = SponsorshipRequest::with(['user:id,name,shop_name', 'product:id,name'])
            ->orderBy('created_at', 'desc')
            ->limit(20)
            ->get();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="monetization_report.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($metrics, $recentSubscribers, $sponsorshipRequests) {
            $file = fopen('php://output', 'w');

            // SECTION 1: Monetization Overview Metrics
            fputcsv($file, ['MONETIZATION OVERVIEW METRICS']);
            fputcsv($file, ['Metric', 'Value']);
            fputcsv($file, ['Plan MRR', 'PHP ' . number_format($metrics['mrr']['value'] ?? 0, 2)]);
            fputcsv($file, ['Transaction Fees Collected', 'PHP ' . number_format($metrics['platform_fees']['value'] ?? 0, 2)]);
            fputcsv($file, ['Total Paid Subscribers', $metrics['subscribers']['total_paid'] ?? 0]);
            fputcsv($file, ['Premium Tier Subscribers', $metrics['subscribers']['premium'] ?? 0]);
            fputcsv($file, ['Elite Tier Subscribers', $metrics['subscribers']['elite'] ?? 0]);
            fputcsv($file, ['Free Tier Artisans', $metrics['subscribers']['free'] ?? 0]);
            fputcsv($file, ['Active Sponsorships', $metrics['sponsorships']['value'] ?? 0]);
            fputcsv($file, []);

            // SECTION 2: Recent Plan Changes
            fputcsv($file, ['RECENT PLAN CHANGES']);
            fputcsv($file, ['Artisan', 'Shop Name', 'Previous Tier', 'New Tier', 'Direction', 'Date']);
            foreach ($recentSubscribers as $sub) {
                fputcsv($file, [
                    $sub['name'] ?? '',
                    $sub['shop_name'] ?? '',
                    $sub['previous_tier_label'] ?? 'Free',
                    $sub['tier'] === 'super_premium' ? 'Premium+' : ($sub['tier'] ?? ''),
                    $sub['change_direction'] ?? '',
                    $sub['date'] ?? ''
                ]);
            }
            fputcsv($file, []);

            // SECTION 3: Sponsored Campaigns
            fputcsv($file, ['SPONSORED CAMPAIGNS']);
            fputcsv($file, ['Artisan', 'Product', 'Status', 'Date']);
            foreach ($sponsorshipRequests as $req) {
                fputcsv($file, [
                    $req->user->name ?? '',
                    $req->product->name ?? 'Unknown Product',
                    ucfirst($req->status),
                    $req->created_at->format('M d, Y h:i A')
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function getSystemSettings(): array
    {
        return [
            'platform_name' => $this->settings->get('platform_name', 'LikhangKamay'),
            'platform_logo' => $this->settings->get('platform_logo'),
            'favicon' => $this->settings->get('favicon'),
            'primary_color' => $this->settings->get('primary_color', '#8B4513'),
            'seo_metadata' => $this->settings->get('seo_metadata', [
                'title' => 'LikhangKamay | Artisan Marketplace',
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
            'convenience_fee' => $this->settings->get('convenience_fee', 3.0),
            'maintenance_mode' => $this->settings->get('maintenance_mode', false),
            'paymongo_enabled' => $this->settings->get('paymongo_enabled', true),

            // Subscription Tier Settings
            'tier_free_limit' => $this->settings->get('tier_free_limit', 3),
            'tier_premium_price' => $this->settings->get('tier_premium_price', 199.00),
            'tier_premium_limit' => $this->settings->get('tier_premium_limit', 10),
            'tier_super_premium_price' => $this->settings->get('tier_super_premium_price', 399.00),
            'tier_super_premium_limit' => $this->settings->get('tier_super_premium_limit', 50),

            // SMTP Settings
            'mail_host' => $this->settings->get('mail_host', 'smtp.mailtrap.io'),
            'mail_port' => $this->settings->get('mail_port', '2525'),
            'mail_encryption' => $this->settings->get('mail_encryption', 'tls'),
            'mail_username' => $this->settings->get('mail_username', ''),
            'mail_password' => $this->settings->get('mail_password', ''),
            'mail_from_address' => $this->settings->get('mail_from_address', 'noreply@likhangkamay.app'),
            'mail_from_name' => $this->settings->get('mail_from_name', 'LikhangKamay'),
        ];
    }

    private function getMonetizationMetrics(): array
    {
        $premiumPrice = (float) $this->settings->get('tier_premium_price', 199.00);
        $elitePrice = (float) $this->settings->get('tier_super_premium_price', 399.00);

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

        $totalCommission = Order::where('status', '!=', 'cancelled')->sum('platform_commission_amount');
        $totalConvenience = Order::where('status', '!=', 'cancelled')->sum('convenience_fee_amount');
        $totalPlatformFees = (float) $totalCommission + (float) $totalConvenience;

        $previousCommission = Order::where('status', '!=', 'cancelled')
            ->where('created_at', '<', now()->subDays(30))
            ->sum('platform_commission_amount');
        $previousConvenience = Order::where('status', '!=', 'cancelled')
            ->where('created_at', '<', now()->subDays(30))
            ->sum('convenience_fee_amount');
        $previousPlatformFees = (float) $previousCommission + (float) $previousConvenience;

        $feesGrowth = 0;
        if ($previousPlatformFees > 0) {
            $feesGrowth = (($totalPlatformFees - $previousPlatformFees) / $previousPlatformFees) * 100;
        } elseif ($totalPlatformFees > 0) {
            $feesGrowth = 100;
        }

        $platformFeesMetric = [
            'value' => $totalPlatformFees,
            'growth' => round($feesGrowth, 1),
            'trend' => $feesGrowth > 0 ? 'up' : ($feesGrowth < 0 ? 'down' : 'neutral'),
            'basis' => 'Cumulative commission and convenience fees collected from successful orders.'
        ];

        return [
            'mrr' => $mrrMetric,
            'sponsorships' => $sponsorshipMetric,
            'platform_fees' => $platformFeesMetric,
            'subscribers' => [
                'free' => $freeUsersCount,
                'premium' => $premiumUsersCount,
                'elite' => $eliteUsersCount,
                'total_paid' => $premiumUsersCount + $eliteUsersCount,
            ],
            'pendingSponsorships' => $pendingSponsorships,
        ];
    }

    private function getRecentSubscribers(): array
    {
        return UserTierLog::query()
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
                    'avatar_url' => $user->avatar_url,
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
            ->values()
            ->toArray();
    }

    public function update(Request $request)
    {
        Gate::authorize('admin-action');
        $validated = $request->validate([
            'platform_name' => 'sometimes|required|string|max:255',
            'platform_logo' => 'nullable|image|max:2048',
            'favicon' => 'nullable|file|mimes:ico,png|max:512',
            'primary_color' => ['sometimes', 'required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
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
            'convenience_fee' => 'required|numeric|min:0|max:100',
            'maintenance_mode' => 'required|boolean',
            'paymongo_enabled' => 'required|boolean',

            // Subscription Tier Validation
            'tier_free_limit' => 'sometimes|required|integer|min:1',
            'tier_premium_price' => 'sometimes|required|numeric|min:0',
            'tier_premium_limit' => 'sometimes|required|integer|min:1',
            'tier_super_premium_price' => 'sometimes|required|numeric|min:0',
            'tier_super_premium_limit' => 'sometimes|required|integer|min:1',

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
        if (isset($validated['primary_color']) && $this->settings->get('primary_color') !== $validated['primary_color']) {
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

        if ((float)$this->settings->get('convenience_fee') !== (float)$validated['convenience_fee']) {
            \App\Models\PlatformActivity::log(
                'CONVENIENCE_FEE_UPDATE',
                "Changed site-wide convenience fee rate from " . $this->settings->get('convenience_fee') . "% to " . $validated['convenience_fee'] . "%"
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

        // Audit Logging for subscription plan modifications
        if (isset($validated['tier_free_limit']) && (int)$this->settings->get('tier_free_limit') !== (int)$validated['tier_free_limit']) {
            \App\Models\PlatformActivity::log(
                'TIER_LIMIT_UPDATE',
                "Changed Free plan product limit from " . $this->settings->get('tier_free_limit') . " to " . $validated['tier_free_limit']
            );
        }
        if (isset($validated['tier_premium_price']) && (float)$this->settings->get('tier_premium_price') !== (float)$validated['tier_premium_price']) {
            \App\Models\PlatformActivity::log(
                'TIER_PRICE_UPDATE',
                "Changed Premium plan monthly price from ₱" . $this->settings->get('tier_premium_price') . " to ₱" . $validated['tier_premium_price']
            );
        }
        if (isset($validated['tier_premium_limit']) && (int)$this->settings->get('tier_premium_limit') !== (int)$validated['tier_premium_limit']) {
            \App\Models\PlatformActivity::log(
                'TIER_LIMIT_UPDATE',
                "Changed Premium plan product limit from " . $this->settings->get('tier_premium_limit') . " to " . $validated['tier_premium_limit']
            );
        }
        if (isset($validated['tier_super_premium_price']) && (float)$this->settings->get('tier_super_premium_price') !== (float)$validated['tier_super_premium_price']) {
            \App\Models\PlatformActivity::log(
                'TIER_PRICE_UPDATE',
                "Changed Elite plan monthly price from ₱" . $this->settings->get('tier_super_premium_price') . " to ₱" . $validated['tier_super_premium_price']
            );
        }
        if (isset($validated['tier_super_premium_limit']) && (int)$this->settings->get('tier_super_premium_limit') !== (int)$validated['tier_super_premium_limit']) {
            \App\Models\PlatformActivity::log(
                'TIER_LIMIT_UPDATE',
                "Changed Elite plan product limit from " . $this->settings->get('tier_super_premium_limit') . " to " . $validated['tier_super_premium_limit']
            );
        }

        if (isset($validated['platform_name'])) {
            $validated['platform_name'] = strip_tags($validated['platform_name']);
        }
        if (isset($validated['seo_metadata']['title'])) {
            $validated['seo_metadata']['title'] = strip_tags($validated['seo_metadata']['title']);
        }
        if (isset($validated['seo_metadata']['description'])) {
            $validated['seo_metadata']['description'] = strip_tags($validated['seo_metadata']['description']);
        }
        if (isset($validated['seo_metadata']['keywords'])) {
            $validated['seo_metadata']['keywords'] = strip_tags($validated['seo_metadata']['keywords']);
        }
        if (isset($validated['contact_info']['address'])) {
            $validated['contact_info']['address'] = strip_tags($validated['contact_info']['address']);
        }
        if (isset($validated['mail_from_name'])) {
            $validated['mail_from_name'] = strip_tags($validated['mail_from_name']);
        }

        if (isset($validated['platform_name'])) {
            $this->settings->set('platform_name', $validated['platform_name']);
        }
        if (isset($validated['primary_color'])) {
            $this->settings->set('primary_color', $validated['primary_color']);
        }
        $this->settings->set('seo_metadata', $validated['seo_metadata'], 'json');
        $this->settings->set('contact_info', $validated['contact_info'], 'json');
        $this->settings->set('social_links', $validated['social_links'], 'json');
        
        // Save Operational Settings
        $this->settings->set('commission_rate', $validated['commission_rate'], 'float');
        $this->settings->set('convenience_fee', $validated['convenience_fee'], 'float');
        $this->settings->set('maintenance_mode', $validated['maintenance_mode'] ? 'true' : 'false', 'boolean');
        $this->settings->set('paymongo_enabled', $validated['paymongo_enabled'] ? 'true' : 'false', 'boolean');

        // Save Subscription Tier settings
        if (isset($validated['tier_free_limit'])) {
            $this->settings->set('tier_free_limit', $validated['tier_free_limit'], 'integer');
        }
        if (isset($validated['tier_premium_price'])) {
            $this->settings->set('tier_premium_price', $validated['tier_premium_price'], 'float');
        }
        if (isset($validated['tier_premium_limit'])) {
            $this->settings->set('tier_premium_limit', $validated['tier_premium_limit'], 'integer');
        }
        if (isset($validated['tier_super_premium_price'])) {
            $this->settings->set('tier_super_premium_price', $validated['tier_super_premium_price'], 'float');
        }
        if (isset($validated['tier_super_premium_limit'])) {
            $this->settings->set('tier_super_premium_limit', $validated['tier_super_premium_limit'], 'integer');
        }

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

    /**
     * Get deleted/trash items queue and stats
     */
    private function getTrashQueueAndStats()
    {
        $deletedProducts = $this->getDeletedProducts();
        $deletedCategories = $this->getDeletedCategories();
        $deletedOrders = $this->getDeletedOrders();

        $queue = collect([])
            ->concat($deletedProducts)
            ->concat($deletedCategories)
            ->concat($deletedOrders)
            ->sortByDesc('deleted_at')
            ->values();

        $stats = [
            'totalItems' => $queue->count(),
            'products' => count($deletedProducts),
            'categories' => count($deletedCategories),
            'orders' => count($deletedOrders),
        ];

        return [
            'queue' => $queue,
            'stats' => $stats,
        ];
    }

    /**
     * Get deleted products
     */
    private function getDeletedProducts()
    {
        return Product::onlyTrashed()
            ->with('user:id,name,shop_name')
            ->orderBy('deleted_at', 'desc')
            ->limit(100)
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'type' => 'Product',
                'context' => $p->user?->shop_name ?? $p->user?->name ?? 'Unknown Shop',
                'deleted_at' => $p->deleted_at->toIso8601String(),
                'expires_at' => $p->deleted_at->addDays(30)->toIso8601String(),
            ]);
    }

    /**
     * Get deleted categories
     */
    private function getDeletedCategories()
    {
        return Category::onlyTrashed()
            ->orderBy('deleted_at', 'desc')
            ->get()
            ->map(fn($c) => [
                'id' => $c->id,
                'name' => $c->name,
                'type' => 'Category',
                'context' => 'Global Taxonomy',
                'deleted_at' => $c->deleted_at->toIso8601String(),
                'expires_at' => $c->deleted_at->addDays(30)->toIso8601String(),
            ]);
    }

    /**
     * Get deleted orders
     */
    private function getDeletedOrders()
    {
        return Order::onlyTrashed()
            ->with('user:id,name')
            ->orderBy('deleted_at', 'desc')
            ->limit(100)
            ->get()
            ->map(fn($o) => [
                'id' => $o->id,
                'name' => "Order #{$o->order_number}",
                'type' => 'Order',
                'context' => $o->user?->name ?? 'Unknown Customer',
                'deleted_at' => $o->deleted_at->toIso8601String(),
                'expires_at' => $o->deleted_at->addDays(30)->toIso8601String(),
            ]);
    }
}

