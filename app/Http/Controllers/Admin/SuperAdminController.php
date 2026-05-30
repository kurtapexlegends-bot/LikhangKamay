<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;

use App\Models\User;
use App\Models\PlatformActivity;
use App\Models\SponsorshipRequest;
use App\Models\SystemAnnouncement;
use App\Models\UserTierLog;
use App\Models\ArtisanStatusLog;
use App\Support\StructuredAddress;
use App\Services\Admin\AdminMetricsService;
use App\Services\Admin\AdminAnalyticsService;
use App\Mail\ArtisanApproved;
use App\Mail\ArtisanRejected;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
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
                        ->get(['id', 'name', 'email', 'role', 'artisan_status', 'created_at', 'shop_name', 'avatar', 'premium_tier', 'seller_owner_id', 'email_verified_at', 'must_change_password', 'staff_module_permissions'])
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
     * Monetization Dashboard
     */
    public function monetization()
    {
        try {
            return Inertia::render('Admin/Analytics/Monetization', [
                'metrics' => (function() {
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

                    return [
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
                })(),
                'recentSubscribers' => (function() {
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
                })(),
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
            ]);
        } catch (\Throwable $e) {
            Log::error("SuperAdmin Monetization error: " . $e->getMessage());
            return Inertia::render('Admin/Analytics/Monetization', [
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

    /**
     * User Management
     */
    public function users(Request $request)
    {
        try {
            $search = trim((string) $request->get('search', ''));
            $roleFilter = in_array($request->get('role'), ['all', 'artisan', 'buyer', 'super_admin']) ? $request->get('role') : 'all';

            $query = $this->buildUserQuery($roleFilter, $search);

            $users = $query->orderBy('created_at', 'desc')->paginate(10)->through(fn($user) => $this->mapAdminPrimaryAccount($user, $search));

            $orphanedStaff = User::where('role', 'staff')
                ->whereNull('seller_owner_id')
                ->get()
                ->map(fn($u) => [
                    'id' => $u->id,
                    'name' => $u->name,
                    'email' => $u->email,
                    'created_at' => $u->created_at->format('M d, Y'),
                ]);

            return Inertia::render('Admin/Compliance/Users', [
                'users' => $users,
                'filters' => ['role' => $roleFilter, 'search' => $search],
                'unlinkedStaffGroup' => [
                    'staff_members' => $orphanedStaff,
                    'staff_count' => $orphanedStaff->count(),
                ],
            ]);
        } catch (\Throwable $e) {
            Log::error("SuperAdmin Users error: " . $e->getMessage());
            return back()->with('error', 'Error loading users.');
        }
    }

    /**
     * Artisan Application Management
     */
    public function pendingArtisans()
    {
        $artisans = User::where('role', 'artisan')
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

        return Inertia::render('Admin/Catalog/PendingArtisans', ['artisans' => $artisans]);
    }

    public function markArtisanDocumentViewed(Request $request, int|string $id)
    {
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

    public function approveArtisan(int|string $id)
    {
        $artisan = User::where('role', 'artisan')->where('artisan_status', 'pending')->findOrFail($id);

        // REQUIREMENT: Admin must have previewed all required documents before approving
        $requiredKeys = $this->getSubmittedArtisanDocumentKeys($artisan);
        $viewedKeys = $this->getViewedArtisanDocumentKeys($artisan->id);
        
        $missingKeys = array_diff($requiredKeys, $viewedKeys);
        
        if (!empty($missingKeys)) {
            return back()->withErrors([
                'documents' => 'Preview all submitted documents before approving this application.'
            ]);
        }

        ArtisanStatusLog::create(['user_id' => $artisan->id, 'previous_status' => $artisan->artisan_status, 'new_status' => 'approved']);
        $artisan->update(['artisan_status' => 'approved', 'approved_at' => now(), 'approved_by' => Auth::id()]);

        $this->clearViewedArtisanDocumentKeys($id);

        // Log Activity
        PlatformActivity::log(
            'artisan_approved',
            "Approved artisan application for: {$artisan->shop_name} ({$artisan->name})",
            ['artisan_id' => $artisan->id, 'shop_name' => $artisan->shop_name]
        );

        try {
            if ($artisan->email) Mail::to($artisan->email)->send(new ArtisanApproved($artisan));
        } catch (\Exception $e) { Log::error('Email failed: ' . $e->getMessage()); }

        return back()->with('success', 'Artisan approved successfully!');
    }

    public function rejectArtisan(Request $request, int|string $id)
    {
        $request->validate(['reason' => 'required|string|min:10']);
        $artisan = User::where('role', 'artisan')->where('artisan_status', 'pending')->findOrFail($id);

        ArtisanStatusLog::create(['user_id' => $artisan->id, 'previous_status' => $artisan->artisan_status, 'new_status' => 'rejected']);
        $artisan->update(['artisan_status' => 'rejected', 'artisan_rejection_reason' => $request->reason]);

        $this->clearViewedArtisanDocumentKeys($id);

        // Log Activity
        PlatformActivity::log(
            'artisan_rejected',
            "Rejected artisan application for: {$artisan->name}",
            ['artisan_id' => $artisan->id, 'reason' => $request->reason]
        );

        try {
            if ($artisan->email) Mail::to($artisan->email)->send(new ArtisanRejected($artisan));
        } catch (\Exception $e) { Log::error('Email failed: ' . $e->getMessage()); }

        return back()->with('success', 'Artisan application rejected.');
    }

    /**
     * Insights & Analytics
     */
    public function insights()
    {
        return Inertia::render('Admin/Analytics/Insights', $this->analytics->getInsightsData());
    }

    /**
     * System Announcements
     */
    public function announcements()
    {
        return Inertia::render('Admin/Layout/Announcements', [
            'announcements' => SystemAnnouncement::with('creator:id,name')->latest()->get(),
        ]);
    }

    public function storeAnnouncement(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|in:info,warning,danger,success,custom',
            'target_audience' => 'required|in:all,artisans,buyers',
            'is_active' => 'boolean',
        ]);

        if ($request->boolean('is_active')) {
            SystemAnnouncement::where('is_active', true)->update(['is_active' => false]);
            $validated['starts_at'] = now();
            $validated['broadcast_version'] = 1;
        }

        $validated['created_by'] = Auth::id();
        SystemAnnouncement::create($validated);

        if ($request->boolean('is_active')) {
            $this->clearAnnouncementCache();
        }

        return back()->with('success', 'Announcement created.');
    }

    public function updateAnnouncement(Request $request, int|string $id)
    {
        $announcement = SystemAnnouncement::findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'type' => 'required|in:info,warning,danger,success,custom',
            'target_audience' => 'required|in:all,artisans,buyers',
            'is_active' => 'boolean',
        ]);

        if ($request->boolean('is_active') && !$announcement->is_active) {
            SystemAnnouncement::where('is_active', true)->update(['is_active' => false]);
            $validated['starts_at'] = now();
            $validated['broadcast_version'] = ($announcement->broadcast_version ?? 0) + 1;
        }

        $announcement->update($validated);
        $this->clearAnnouncementCache();

        return back()->with('success', 'Announcement updated.');
    }

    public function broadcastAnnouncement(int|string $id)
    {
        $announcement = SystemAnnouncement::findOrFail($id);
        
        // EXCLUSIVE BROADCAST: Deactivate all currently active announcements 
        // to prevent overlapping or clashing global states.
        SystemAnnouncement::where('is_active', true)->update(['is_active' => false]);
        
        $announcement->update([
            'is_active' => true,
            'broadcast_version' => ($announcement->broadcast_version ?? 0) + 1,
            'starts_at' => now(),
        ]);

        $this->clearAnnouncementCache();

        return back()->with('success', 'Announcement broadcasted successfully! All other active announcements have been paused.');
    }

    public function stopAnnouncement(int|string $id)
    {
        $announcement = SystemAnnouncement::findOrFail($id);
        $announcement->update(['is_active' => false]);
        $this->clearAnnouncementCache();

        return back()->with('success', 'Announcement stopped.');
    }

    public function destroyAnnouncement(int|string $id)
    {
        $announcement = SystemAnnouncement::findOrFail($id);
        $announcement->delete();
        $this->clearAnnouncementCache();

        return back()->with('success', 'Announcement deleted.');
    }

    private function clearAnnouncementCache()
    {
        foreach (['guest', 'artisan', 'staff', 'buyer', 'super_admin'] as $role) {
            Cache::forget('global_announcement_' . $role);
        }
    }

    public function viewArtisan(int|string $id)
    {
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

    public function bulkApproveArtisans(Request $request)
    {
        $request->validate(['ids' => 'required|array', 'ids.*' => 'exists:users,id']);
        
        $count = 0;
        foreach ($request->ids as $id) {
            $artisan = User::where('role', 'artisan')->where('artisan_status', 'pending')->find($id);
            if ($artisan) {
                $artisan->update(['artisan_status' => 'approved', 'approved_at' => now(), 'approved_by' => Auth::id()]);
                $count++;
                try {
                    if ($artisan->email) Mail::to($artisan->email)->send(new ArtisanApproved($artisan));
                } catch (\Exception $e) { Log::error('Bulk Email failed: ' . $e->getMessage()); }
            }
        }

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
            if ($user->must_change_password) {
                return ['Password Reset Required', 'warning'];
            }
            return ['Access Active', 'success'];
        }

        return [$user->hasVerifiedEmail() ? 'Verified' : 'Unverified', $user->hasVerifiedEmail() ? 'success' : 'warning'];
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
            'staff_count' => $user->staff_members_count ?? 0,
            'matched_staff_count' => $matchedStaffCount,
            'staff_members' => $staffMembers->map(function($s) {
                [$sState, $sTone] = $this->resolveAdminAccountState($s);
                return [
                    'id' => $s->id,
                    'name' => $s->name,
                    'email' => $s->email,
                    'employee_name' => $s->employee->name ?? $s->name,
                    'employee_linked' => (bool)$s->employee_id,
                    'email_verified' => (bool)$s->email_verified_at,
                    'requires_password_change' => (bool)$s->must_change_password,
                    'account_state' => $sState,
                    'account_state_tone' => $sTone,
                ];
            })->values(),
        ];
    }

    public function checkArtisanSlug(Request $request)
    {
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
