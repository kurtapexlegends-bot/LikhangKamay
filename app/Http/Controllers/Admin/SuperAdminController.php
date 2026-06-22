<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

use App\Models\User;
use App\Models\PlatformActivity;
use App\Models\SponsorshipRequest;
use App\Models\UserTierLog;
use App\Models\ArtisanStatusLog;
use App\Support\StructuredAddress;
use App\Services\Admin\AdminMetricsService;
use App\Services\Admin\AdminAnalyticsService;
use App\Actions\Admin\Users\ApproveArtisan;
use App\Actions\Admin\Users\RejectArtisan;
use App\Actions\Admin\Users\BulkApproveArtisans;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
use Inertia\Inertia;

class SuperAdminController extends Controller
{
    protected AdminMetricsService $metrics;
    protected AdminAnalyticsService $analytics;

    public function __construct(AdminMetricsService $metrics, AdminAnalyticsService $analytics)
    {
        $this->metrics = $metrics;
        $this->analytics = $analytics;
    }

    private const ARTISAN_DOCUMENT_FIELDS = [
        'business_permit',
        'dti_registration',
        'valid_id',
        'tin_id',
    ];

    /**
     * Admin Dashboard - Platform overview
     */
    public function dashboard()
    {
        Gate::authorize('admin-action');

        try {
            return Inertia::render('Admin/Layout/Dashboard', [
                'stats' => (function() {
                    $totalArtisans = $this->metrics->getMetric(User::class, ['role' => 'artisan']);
                    
                    // Buyers
                    $buyerCurrent = User::where(function($q) {
                        $q->where('role', 'buyer')->orWhereNull('role');
                    })->count();
                    
                    $buyerPrevious = User::where(function($q) {
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
                        'trend' => $buyerGrowth > 0 ? 'up' : ($buyerGrowth < 0 ? 'down' : 'neutral')
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
                        'trend' => $pendingGrowth > 0 ? 'up' : ($pendingGrowth < 0 ? 'down' : 'neutral')
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
                        'trend' => $approvedGrowth > 0 ? 'up' : ($approvedGrowth < 0 ? 'down' : 'neutral')
                    ];
                    
                    $rejectedArtisans = User::where('role', 'artisan')->where('artisan_status', 'rejected')->count();

                    return [
                        'totalArtisans' => $totalArtisans,
                        'totalBuyers' => $totalBuyers,
                        'pendingArtisans' => $pendingArtisans,
                        'approvedArtisans' => $approvedArtisans,
                        'rejectedArtisans' => $rejectedArtisans,
                    ];
                })(),
                'recentUsers' => (function() {
                    return User::with('sellerOwner:id,name,shop_name')
                        ->orderBy('created_at', 'desc')
                        ->limit(10)
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
                                'premium_tier' => $user->premium_tier,
                                'account_state' => $accountState,
                                'account_state_tone' => $accountStateTone,
                                'seller_shop_name' => $user->sellerOwner?->shop_name,
                            ];
                        })
                        ->values();
                })(),
                'activities' => (function() {
                    return PlatformActivity::with('user:id,name,shop_name')->latest()->take(20)->get();
                })(),
            ]);
        } catch (\Throwable $e) {
            Log::error("SuperAdmin Dashboard error: " . $e->getMessage());
            return Inertia::render('Admin/Layout/Dashboard', [
                'stats' => [
                    'totalArtisans' => ['value' => 0, 'growth' => 0, 'trend' => 'neutral'],
                    'totalBuyers' => ['value' => 0, 'growth' => 0, 'trend' => 'neutral'],
                    'pendingArtisans' => ['value' => 0, 'growth' => 0, 'trend' => 'neutral'],
                    'approvedArtisans' => ['value' => 0, 'growth' => 0, 'trend' => 'neutral'],
                    'rejectedArtisans' => 0,
                ],
                'recentUsers' => [],
                'activities' => [],
                'db_error' => true
            ]);
        }
    }

    /**
     * User Directory & Approvals Center
     */
    public function userManager(Request $request)
    {
        Gate::authorize('admin-action');

        try {
            $tab = $request->get('tab', 'directory');
            $search = trim((string) $request->get('search', ''));
            $roleFilter = in_array($request->get('role'), ['all', 'artisan', 'buyer', 'super_admin']) ? $request->get('role') : 'all';

            $query = $this->buildUserQuery($roleFilter, $search);
            $users = $query->orderBy('created_at', 'desc')->paginate(10)->through(fn($user) => $this->mapAdminPrimaryAccount($user, $search));

            $orphanedStaff = $this->getOrphanedStaff();
            $artisans = $this->getPendingArtisansList();

            return Inertia::render('Admin/Users/UserManager', [
                'users' => $users,
                'filters' => [
                    'role' => $roleFilter,
                    'search' => $search,
                    'tab' => $tab,
                ],
                'unlinkedStaffGroup' => [
                    'staff_members' => $orphanedStaff,
                    'staff_count' => $orphanedStaff->count(),
                ],
                'artisans' => $artisans,
            ]);
        } catch (\Throwable $e) {
            Log::error("SuperAdmin UserManager error: " . $e->getMessage());
            return back()->with('error', 'Error loading user manager.');
        }
    }

    /**
     * Get orphaned staff members.
     */
    private function getOrphanedStaff()
    {
        return User::where('role', 'staff')
            ->whereNull('seller_owner_id')
            ->with('employee')
            ->get()
            ->map(fn($s) => $this->mapAdminStaffMember($s));
    }

    /**
     * Get pending artisan applications.
     */
    private function getPendingArtisansList()
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
                'shop_name' => $user->shop_name,
                'phone_number' => $user->phone_number,
                'address' => StructuredAddress::formatPhilippineAddress(['street_address' => $user->street_address, 'barangay' => $user->barangay, 'city' => $user->city, 'region' => $user->region, 'postal_code' => $user->zip_code]),
                'business_permit' => $user->business_permit ? asset('storage/' . $user->business_permit) : null,
                'dti_registration' => $user->dti_registration ? asset('storage/' . $user->dti_registration) : null,
                'valid_id' => $user->valid_id ? asset('storage/' . $user->valid_id) : null,
                'tin_id' => $user->tin_id ? asset('storage/' . $user->tin_id) : null,
                'submitted_at' => $user->setup_completed_at->format('M d, Y h:i A'),
                'viewed_documents' => $this->getViewedArtisanDocumentKeys($user->id),
            ]);
    }

    public function markArtisanDocumentViewed(Request $request, int|string $id)
    {
        Gate::authorize('admin-action');
        $request->validate(['document' => 'required|string|in:business_permit,dti_registration,valid_id,tin_id']);
        $documentKey = $request->document;

        $viewed = $this->getViewedArtisanDocumentKeys($id);
        if (!in_array($documentKey, $viewed)) {
            $viewed[] = $documentKey;
            Session::put($this->artisanDocumentReviewSessionKey($id), $viewed);
        }

        return response()->json([
            'success' => true, 
            'viewed' => $viewed,
            'viewed_document_keys' => $viewed // Alignment with PendingArtisanApprovalTest
        ]);
    }

    public function approveArtisan(int|string $id, ApproveArtisan $approveArtisan)
    {
        Gate::authorize('admin-action');

        $approveArtisan->execute($id, Auth::id());

        return back()->with('success', 'Artisan approved successfully!');
    }

    public function rejectArtisan(Request $request, int|string $id, RejectArtisan $rejectArtisan)
    {
        Gate::authorize('admin-action');
        $request->validate(['reason' => 'required|string|min:10']);

        $rejectArtisan->execute($id, strip_tags($request->reason));

        return back()->with('success', 'Artisan application rejected.');
    }

    /**
     * Insights & Analytics
     */
    public function insights()
    {
        Gate::authorize('admin-action');
        return Inertia::render('Admin/Analytics/Insights', $this->analytics->getInsightsData());
    }

    public function viewArtisan(int|string $id)
    {
        Gate::authorize('admin-action');
        $user = User::where('role', 'artisan')->findOrFail($id);
        
        return Inertia::render('Admin/ArtisanDetail', [
            'artisan' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'shop_name' => $user->shop_name,
                'artisan_status' => $user->artisan_status,
                'avatar' => $user->avatar,
                'created_at' => $user->created_at->format('M d, Y'),
                'setup_completed_at' => $user->setup_completed_at?->format('M d, Y'),
            ]
        ]);
    }

    public function bulkApproveArtisans(Request $request, BulkApproveArtisans $bulkApproveArtisans)
    {
        Gate::authorize('admin-action');
        $request->validate(['ids' => 'required|array', 'ids.*' => 'exists:users,id']);
        
        $count = $bulkApproveArtisans->execute($request->ids, Auth::id());

        return back()->with('success', "Successfully approved {$count} artisans.");
    }

    // --- Private Helpers ---
    
    private function resolveAdminRoleLabel(User $user)
    {
        if ($user->isAdmin()) return 'Admin';
        if ($user->isArtisan()) return 'Artisan';
        if ($user->isStaff()) return 'Staff';
        return 'Buyer';
    }

    private function resolveAdminAccountState(User $user)
    {
        if ($user->isArtisan()) {
            return match ($user->artisan_status) {
                'approved' => ['Approved', 'success'],
                'rejected' => ['Rejected', 'danger'],
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

    private function mapAdminStaffMember(User $s)
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
        ];
    }

    private function mapAdminPrimaryAccount(User $user, string $search)
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

            // If specific staff members match the search, we ONLY show those.
            // If NO staff members match, but the OWNER matched (which is why we are here),
            // we show ALL staff members for that owner.
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
            'created_at' => $user->created_at->format('M d, Y'),
            'avatar' => $user->avatar,
            'premium_tier' => $user->premium_tier,
            'email_verified' => (bool)$user->email_verified_at,
            'workspace_access_enabled' => $user->isWorkspaceAccessEnabled(),
            'staff_count' => $user->staff_members_count ?? 0,
            'matched_staff_count' => $matchedStaffCount,
            'staff_members' => $staffMembers->map(fn($s) => $this->mapAdminStaffMember($s))->values(),
        ];
    }

    public function checkArtisanSlug(Request $request)
    {
        Gate::authorize('admin-action');
        $exists = User::where('shop_slug', $request->slug)->when($request->exclude_id, fn($q) => $q->where('id', '!=', $request->exclude_id))->exists();
        return response()->json(['exists' => $exists]);
    }

    private function artisanDocumentReviewSessionKey(int|string $id): string
    {
        return "artisan_review_docs_{$id}";
    }

    private function getViewedArtisanDocumentKeys(int|string $id): array
    {
        return Session::get($this->artisanDocumentReviewSessionKey($id), []);
    }

    private function clearViewedArtisanDocumentKeys(int|string $id): void
    {
        Session::forget($this->artisanDocumentReviewSessionKey($id));
    }

    private function getSubmittedArtisanDocumentKeys(User $user): array
    {
        $keys = [];
        foreach (self::ARTISAN_DOCUMENT_FIELDS as $field) {
            if (!empty($user->$field)) {
                $keys[] = $field;
            }
        }
        return $keys;
    }

    /**
     * Build the base query for user management.
     */
    private function buildUserQuery(string $roleFilter, string $search)
    {
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

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('shop_name', 'like', "%{$search}%")
                    ->orWhereHas('staffMembers', function ($sq) use ($search) {
                        $sq->where('name', 'like', "%{$search}%");
                    });
            });
        }

        return $query;
    }
}
