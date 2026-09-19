<?php

declare(strict_types=1);

namespace App\Services\Admin;

use App\Mail\CustomDynamicMail;
use App\Models\PlatformActivity;
use App\Models\User;
use App\Notifications\ArtisanReengagementNotification;
use App\Support\StructuredAddress;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SuperAdminService
{
    private const ARTISAN_DOCUMENT_FIELDS = [
        'business_permit',
        'dti_registration',
        'valid_id',
        'tin_id',
    ];

    public function __construct(
        protected AdminMetricsService $metrics,
        protected AdminAnalyticsService $analytics
    ) {}

    /**
     * Retrieve platform dashboard overview data.
     */
    public function getDashboardData(): array
    {
        $totalArtisans = $this->metrics->getMetric(User::class, ['role' => 'artisan']);

        // Buyers
        $buyerCurrent = User::where(function ($q) {
            $q->where('role', 'buyer')->orWhereNull('role');
        })->count();

        $buyerPrevious = User::where(function ($q) {
            $q->where('role', 'buyer')->orWhereNull('role');
        })->where('created_at', '<=', now()->subDays(30))->count();

        $buyerGrowth = 0;
        if ($buyerPrevious > 0) {
            $buyerGrowth = (($buyerCurrent - $buyerPrevious) / $buyerPrevious) * 100;
        } elseif ($buyerCurrent > 0) {
            $buyerGrowth = 100;
        }

        $totalBuyers = [
            'value' => $buyerCurrent,
            'growth' => round($buyerGrowth, 1),
            'trend' => $buyerGrowth > 0 ? 'up' : ($buyerGrowth < 0 ? 'down' : 'neutral'),
        ];

        // Pending Artisans
        $currentPending = User::where('role', 'artisan')->where('artisan_status', 'pending')->count();
        $previousPending = $this->metrics->getHistoricalStatusCount('pending', 30);
        $pendingGrowth = 0;
        if ($previousPending > 0) {
            $pendingGrowth = (($currentPending - $previousPending) / $previousPending) * 100;
        } elseif ($currentPending > 0) {
            $pendingGrowth = 100;
        }
        $pendingArtisans = [
            'value' => $currentPending,
            'growth' => round($pendingGrowth, 1),
            'trend' => $pendingGrowth > 0 ? 'up' : ($pendingGrowth < 0 ? 'down' : 'neutral'),
        ];

        // Approved Artisans
        $currentApproved = User::where('role', 'artisan')->where('artisan_status', 'approved')->count();
        $previousApproved = $this->metrics->getHistoricalStatusCount('approved', 30);
        $approvedGrowth = 0;
        if ($previousApproved > 0) {
            $approvedGrowth = (($currentApproved - $previousApproved) / $previousApproved) * 100;
        } elseif ($currentApproved > 0) {
            $approvedGrowth = 100;
        }
        $approvedArtisans = [
            'value' => $currentApproved,
            'growth' => round($approvedGrowth, 1),
            'trend' => $approvedGrowth > 0 ? 'up' : ($approvedGrowth < 0 ? 'down' : 'neutral'),
        ];

        $rejectedArtisans = User::where('role', 'artisan')->where('artisan_status', 'rejected')->count();

        $stats = [
            'totalArtisans' => $totalArtisans,
            'totalBuyers' => $totalBuyers,
            'pendingArtisans' => $pendingArtisans,
            'approvedArtisans' => $approvedArtisans,
            'rejectedArtisans' => $rejectedArtisans,
        ];

        $recentUsers = User::with('sellerOwner:id,name,shop_name')
            ->orderBy('created_at', 'desc')
            ->limit(15)
            ->get(['id', 'name', 'email', 'role', 'artisan_status', 'created_at', 'shop_name', 'avatar', 'premium_tier', 'seller_owner_id', 'email_verified_at', 'must_change_password', 'staff_module_permissions', 'staff_plan_suspended_at'])
            ->map(function (User $user) {
                [$accountState, $accountStateTone] = $this->resolveAdminAccountState($user);

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role ?? 'buyer',
                    'role_label' => $this->resolveAdminRoleLabel($user),
                    'artisan_status' => $user->artisan_status,
                    'created_at' => $user->created_at->toIso8601String(),
                    'shop_name' => $user->shop_name,
                    'avatar' => $user->avatar,
                    'avatar_url' => $user->avatar_url,
                    'premium_tier' => $user->premium_tier,
                    'account_state' => $accountState,
                    'account_state_tone' => $accountStateTone,
                    'seller_shop_name' => $user->sellerOwner?->shop_name,
                ];
            })
            ->values();

        $activities = PlatformActivity::with('user:id,name,shop_name')->latest()->take(10)->get();

        return [
            'stats' => $stats,
            'recentUsers' => $recentUsers,
            'activities' => $activities,
        ];
    }

    /**
     * Retrieve user directory and approvals center dataset.
     */
    public function getUserManagerData(Request $request): array
    {
        $tab = $request->get('tab', 'directory');
        $search = trim((string) $request->get('search', ''));
        $roleFilter = in_array($request->get('role'), ['all', 'artisan', 'buyer', 'super_admin'], true) ? $request->get('role') : 'all';
        $statusFilter = in_array($request->get('status'), ['active', 'suspended', 'pending_artisan'], true) ? $request->get('status') : 'all';
        $verificationFilter = in_array($request->get('verification'), ['verified', 'unverified'], true) ? $request->get('verification') : 'all';
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');

        $query = $this->buildUserQuery($roleFilter, $search, $statusFilter, $verificationFilter, $startDate, $endDate);
        $users = $query->orderBy('created_at', 'desc')->paginate(10)->through(fn($user) => $this->mapAdminPrimaryAccount($user, $search));

        $orphanedStaff = $this->getOrphanedStaff();
        $artisans = $this->getPendingArtisansList();

        return [
            'users' => $users,
            'filters' => [
                'role' => $roleFilter,
                'search' => $search,
                'tab' => $tab,
                'status' => $statusFilter,
                'verification' => $verificationFilter,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'unlinkedStaffGroup' => [
                'staff_members' => $orphanedStaff,
                'staff_count' => $orphanedStaff->count(),
            ],
            'artisans' => $artisans,
        ];
    }

    /**
     * Mark an artisan compliance document as viewed in session.
     */
    public function markArtisanDocumentViewed(int|string $id, string $documentKey): array
    {
        $viewed = $this->getViewedArtisanDocumentKeys($id);
        if (!in_array($documentKey, $viewed, true)) {
            $viewed[] = $documentKey;
            Session::put($this->artisanDocumentReviewSessionKey($id), $viewed);
        }

        return $viewed;
    }

    /**
     * Dispatch 1-click re-engagement notification and email.
     */
    public function reengageArtisan(User $user): void
    {
        $replacements = [
            '{user_name}' => $user->name,
            '{shop_name}' => $user->shop_name ?? 'your storefront',
            '{site_name}' => 'LikhangKamay',
            '{action_url}' => route('dashboard'),
        ];

        Mail::to($user->email)->send(new CustomDynamicMail(
            subjectText: 'We miss your craft on LikhangKamay!',
            headlineText: 'Your artisan shop has been quiet lately',
            bodyText: "Hello {user_name},\n\nWe noticed your shop ({shop_name}) has been inactive recently. Handcrafted lovers and buyers are looking for unique Filipino creations every day on LikhangKamay.\n\nLog in now to restock your listings, post new craft updates, and discover what shoppers are searching for.",
            buttonLabel: 'Open Seller Dashboard',
            buttonUrl: route('dashboard'),
            replacements: $replacements
        ));

        Notification::send($user, new ArtisanReengagementNotification());

        PlatformActivity::log(
            'ARTISAN_REENGAGED',
            "Sent 1-click re-engagement email and platform notification to artisan {$user->name} ({$user->email})"
        );
    }

    /**
     * Toggle account banned/reactivated status and bust public catalogs.
     */
    public function toggleUserStatus(User $user, int $adminId): void
    {
        $user->banned_at = $user->banned_at ? null : now();
        $user->save();

        if ($user->isArtisan()) {
            Cache::forget('shop_catalog_default_page_1');
            Cache::forget("seller_{$user->id}_products");
            Cache::forget("seller_{$user->id}_best_sellers");
            Cache::forget("seller_{$user->id}_stats");
            Cache::forget('catalog_materials');
            Cache::forget('catalog_locations');
            Cache::forget('catalog_categories');
            Cache::forget('home_sponsored_products');
            Cache::forget('home_featured_products_pool');
            Cache::forget('home_top_sellers');
        }

        PlatformActivity::create([
            'user_id' => $adminId,
            'action' => $user->banned_at ? 'suspend_user' : 'reactivate_user',
            'description' => ($user->banned_at ? 'Suspended' : 'Reactivated') . " account: {$user->email} ({$user->name})",
        ]);
    }

    /**
     * Check if a shop slug is already taken.
     */
    public function checkArtisanSlug(string $slug, int|string|null $excludeId = null): bool
    {
        return User::where('shop_slug', $slug)
            ->when($excludeId, fn($q) => $q->where('id', '!=', $excludeId))
            ->exists();
    }

    /**
     * Retrieve artisan detail for review modal/page.
     */
    public function getArtisanDetail(int|string $id): array
    {
        $user = User::where('role', 'artisan')->findOrFail($id);

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'shop_name' => $user->shop_name,
            'artisan_status' => $user->artisan_status,
            'avatar' => $user->avatar,
            'avatar_url' => $user->avatar_url,
            'created_at' => $user->created_at->format('M d, Y'),
            'setup_completed_at' => $user->setup_completed_at?->format('M d, Y'),
        ];
    }

    public function resolveAdminRoleLabel(User $user): string
    {
        if ($user->isAdmin()) return 'Admin';
        if ($user->isArtisan()) return 'Artisan';
        if ($user->isStaff()) return 'Staff';
        return 'Buyer';
    }

    public function resolveAdminAccountState(User $user): array
    {
        if ($user->banned_at !== null) {
            return ['Access Suspended', 'danger'];
        }

        if ($user->isArtisan()) {
            return match ($user->artisan_status) {
                'approved' => ['Approved', 'success'],
                'rejected' => ['Declined', 'danger'],
                default => ['Pending', 'warning'],
            };
        }
        
        if ($user->isStaff()) {
            if (!$user->isWorkspaceAccessEnabled()) {
                return ['Access Suspended', 'danger'];
            }
            if ($user->must_change_password) {
                return ['Password Reset Required', 'warning'];
            }
            return ['Access Active', 'success'];
        }

        return [$user->hasVerifiedEmail() ? 'Verified' : 'Unverified', $user->hasVerifiedEmail() ? 'success' : 'warning'];
    }

    public function mapAdminStaffMember(User $s): array
    {
        [$sState, $sTone] = $this->resolveAdminAccountState($s);
        return [
            'id' => $s->id,
            'name' => $s->name,
            'email' => $s->email,
            'created_at' => $s->created_at ? $s->created_at->format('M d, Y') : null,
            'employee_name' => $s->employee->name ?? $s->name,
            'employee_linked' => (bool)$s->employee_id,
            'email_verified' => (bool)$s->email_verified_at,
            'requires_password_change' => (bool)$s->must_change_password,
            'workspace_access_enabled' => $s->isWorkspaceAccessEnabled(),
            'account_state' => $sState,
            'account_state_tone' => $sTone,
            'staff_role_preset_key' => $s->staff_role_preset_key,
            'module_permissions' => $s->staff_module_permissions,
            'banned_at' => $s->banned_at ? $s->banned_at->toIso8601String() : null,
        ];
    }

    public function mapAdminPrimaryAccount(User $user, string $search): array
    {
        [$state, $tone] = $this->resolveAdminAccountState($user);
        
        $allStaff = $user->staffMembers ?? collect([]);
        $staffMembers = $allStaff;
        $matchedStaffCount = 0;

        if ($search !== '') {
            $matchingStaff = $allStaff->filter(function($s) use ($search) {
                return Str::contains(strtolower((string)$s->name), strtolower($search))
                    || Str::contains(strtolower((string)$s->email), strtolower($search));
            });
            
            $matchedStaffCount = $matchingStaff->count();

            if ($matchingStaff->isNotEmpty()) {
                $staffMembers = $matchingStaff;
            }
        }

        return [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role ?? 'buyer',
            'shop_name' => $user->shop_name,
            'account_state' => $state,
            'account_state_tone' => $tone,
            'created_at' => $user->created_at?->format('M d, Y') ?? 'N/A',
            'avatar' => $user->avatar,
            'avatar_url' => $user->avatar_url,
            'premium_tier' => $user->premium_tier,
            'email_verified' => (bool)$user->email_verified_at,
            'workspace_access_enabled' => $user->isWorkspaceAccessEnabled(),
            'staff_count' => $user->staff_members_count ?? 0,
            'matched_staff_count' => $matchedStaffCount,
            'staff_members' => $staffMembers->map(fn($s) => $this->mapAdminStaffMember($s))->values(),
            'banned_at' => $user->banned_at ? $user->banned_at->toIso8601String() : null,
            'ban_reason' => $user->ban_reason,
            'warning_count' => (int)($user->warning_count ?? 0),
            'warning_reason' => $user->warning_reason,
            'warned_at' => $user->warned_at ? $user->warned_at->toIso8601String() : null,
            'suspended_until' => $user->suspended_until ? $user->suspended_until->toIso8601String() : null,
            'suspension_reason' => $user->suspension_reason,
            'suspended_at' => $user->suspended_at ? $user->suspended_at->toIso8601String() : null,
            'is_suspended' => $user->isSuspended(),
            'is_warned' => $user->isWarned(),
            'is_banned' => $user->isBanned(),
            'days_remaining_suspension' => $user->daysRemainingSuspension(),
            'disciplinary_logs' => rescue(fn() => $user->disciplinaryLogs()->with('admin:id,name')->take(10)->get()->map(fn($log) => [
                'id' => $log->id,
                'action_type' => $log->action_type,
                'reason' => $log->reason,
                'duration_days' => $log->duration_days,
                'suspended_until' => $log->suspended_until?->format('M d, Y'),
                'created_at' => $log->created_at?->format('M d, Y h:i A'),
                'admin_name' => $log->admin?->name ?? 'System Admin',
            ]), collect([])),
        ];
    }

    public function getOrphanedStaff()
    {
        return User::where('role', 'staff')
            ->whereNull('seller_owner_id')
            ->with('employee')
            ->get()
            ->map(fn($s) => $this->mapAdminStaffMember($s));
    }

    public function getPendingArtisansList()
    {
        return User::where('role', 'artisan')
            ->where('artisan_status', 'pending')
            ->whereNotNull('setup_completed_at')
            ->orderBy('setup_completed_at', 'asc')
            ->get()
            ->map(fn($user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'avatar_url' => $user->avatar_url,
                'shop_name' => $user->shop_name,
                'phone_number' => $user->phone_number,
                'city' => $user->city,
                'barangay' => $user->barangay,
                'address' => rescue(fn() => StructuredAddress::formatPhilippineAddress([
                    'street_address' => $user->street_address,
                    'barangay' => $user->barangay,
                    'city' => $user->city,
                    'region' => $user->region,
                    'postal_code' => $user->zip_code
                ]), $user->street_address ?? 'N/A'),
                'region' => $user->region,
                'business_permit' => \App\Services\StorageUrl::url($user->business_permit),
                'dti_registration' => \App\Services\StorageUrl::url($user->dti_registration),
                'valid_id' => \App\Services\StorageUrl::url($user->valid_id),
                'tin_id' => \App\Services\StorageUrl::url($user->tin_id),
                'payout_method' => $user->payout_method,
                'payout_account_name' => $user->payout_account_name,
                'payout_account_number' => $user->payout_account_number,
                'submitted_at' => $user->setup_completed_at?->format('M d, Y h:i A') ?? 'N/A',
                'raw_submitted_at' => $user->setup_completed_at?->toIso8601String(),
                'viewed_documents' => $this->getViewedArtisanDocumentKeys($user->id),
                'viewed_document_keys' => $this->getViewedArtisanDocumentKeys($user->id),
            ]);
    }

    public function artisanDocumentReviewSessionKey(int|string $id): string
    {
        return "artisan_review_docs_{$id}";
    }

    public function getViewedArtisanDocumentKeys(int|string $id): array
    {
        return Session::get($this->artisanDocumentReviewSessionKey($id), []);
    }

    public function buildUserQuery(
        string $roleFilter = 'all',
        string $search = '',
        string $statusFilter = 'all',
        string $verificationFilter = 'all',
        ?string $startDate = null,
        ?string $endDate = null
    ) {
        $query = User::query()
            ->where(function ($q) {
                $q->whereIn('role', ['artisan', 'buyer', 'super_admin'])->orWhereNull('role');
            })
            ->withCount('staffMembers')
            ->with(['staffMembers' => function ($q) {
                $q->with('employee');
            }]);

        if ($roleFilter === 'artisan') {
            $query->where('role', 'artisan');
        } elseif ($roleFilter === 'buyer') {
            $query->where(fn($q) => $q->where('role', 'buyer')->orWhereNull('role'));
        } elseif ($roleFilter === 'super_admin') {
            $query->where('role', 'super_admin');
        }

        if ($statusFilter === 'active') {
            $query->whereNull('banned_at');
        } elseif ($statusFilter === 'suspended') {
            $query->whereNotNull('banned_at');
        } elseif ($statusFilter === 'pending_artisan') {
            $query->where('role', 'artisan')->where('artisan_status', 'pending');
        }

        if ($verificationFilter === 'verified') {
            $query->whereNotNull('email_verified_at');
        } elseif ($verificationFilter === 'unverified') {
            $query->whereNull('email_verified_at');
        }

        if ($startDate) {
            $query->where('created_at', '>=', $startDate . ' 00:00:00');
        }
        if ($endDate) {
            $query->where('created_at', '<=', $endDate . ' 23:59:59');
        }

        if ($search !== '') {
            $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';
            $query->where(function ($q) use ($search, $like) {
                $q->where('name', $like, "%{$search}%")
                    ->orWhere('first_name', $like, "%{$search}%")
                    ->orWhere('last_name', $like, "%{$search}%")
                    ->orWhere('email', $like, "%{$search}%")
                    ->orWhere('shop_name', $like, "%{$search}%")
                    ->orWhere('phone_number', $like, "%{$search}%")
                    ->orWhereHas('staffMembers', function ($sq) use ($search, $like) {
                        $sq->where('name', $like, "%{$search}%")
                           ->orWhere('first_name', $like, "%{$search}%")
                           ->orWhere('last_name', $like, "%{$search}%")
                           ->orWhere('email', $like, "%{$search}%")
                           ->orWhere('phone_number', $like, "%{$search}%");
                    });
            });
        }

        return $query;
    }

    /**
     * Stream a CSV export of insights, overview metrics, velocity, and top artisans.
     */
    public function exportInsightsReport(): StreamedResponse
    {
        $data = $this->analytics->getInsightsData();

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="insights_report.csv"',
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($data) {
            $file = fopen('php://output', 'w');

            fputcsv($file, ['PLATFORM OVERVIEW METRICS']);
            fputcsv($file, ['Metric', 'Value']);
            fputcsv($file, ['Total GMV', 'PHP ' . number_format($data['transactions']['currentGmv'] ?? 0, 2)]);
            fputcsv($file, ['GMV Growth Rate', ($data['transactions']['growthRate'] ?? 0) . '%']);
            fputcsv($file, ['Order Completion Rate', ($data['health']['completionRate'] ?? 0) . '%']);
            fputcsv($file, ['Average Order Value (AOV)', 'PHP ' . number_format($data['health']['aov'] ?? 0, 2)]);
            fputcsv($file, ['Review Rate', ($data['health']['reviewRate'] ?? 0) . '%']);
            fputcsv($file, ['Refund Rate', ($data['health']['refundRate'] ?? 0) . '%']);
            fputcsv($file, ['Active Artisans', $data['churn']['active'] ?? 0]);
            fputcsv($file, ['Artisans At Risk', $data['churn']['atRisk'] ?? 0]);
            fputcsv($file, ['Churned Artisans', $data['churn']['churned'] ?? 0]);
            fputcsv($file, []);

            fputcsv($file, ['TRANSACTION VELOCITY (12-MONTH TRENDS)']);
            fputcsv($file, ['Month', 'Orders Count', 'GMV']);
            foreach ($data['transactions']['monthly'] ?? [] as $month) {
                fputcsv($file, [
                    $month['name'],
                    $month['orders'],
                    'PHP ' . number_format($month['gmv'], 2),
                ]);
            }
            fputcsv($file, []);

            fputcsv($file, ['CATEGORY GMV PERFORMANCE']);
            fputcsv($file, ['Category', 'Item Quantity Sold', 'GMV']);
            foreach ($data['categories'] ?? [] as $cat) {
                fputcsv($file, [
                    $cat['category'] ?? $cat['name'] ?? 'Unknown',
                    $cat['value'] ?? $cat['quantity'] ?? 0,
                    'PHP ' . number_format($cat['gmv'] ?? 0, 2),
                ]);
            }
            fputcsv($file, []);

            fputcsv($file, ['TOP PERFORMING ARTISANS']);
            fputcsv($file, ['Rank', 'Artisan Name', 'Shop Name', 'Tier', 'Orders Count', 'Total GMV']);
            foreach ($data['topArtisans'] ?? [] as $idx => $artisan) {
                fputcsv($file, [
                    '#' . ($idx + 1),
                    $artisan['name'],
                    $artisan['shop_name'],
                    $artisan['premium_tier'] ?? 'free',
                    $artisan['orders_count'] ?? 0,
                    'PHP ' . number_format($artisan['total_gmv'] ?? 0, 2),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
