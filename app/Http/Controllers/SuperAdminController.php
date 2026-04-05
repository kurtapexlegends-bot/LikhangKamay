<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use App\Models\SponsorshipRequest;
use App\Mail\ArtisanApproved;
use App\Mail\ArtisanRejected;
use App\Models\ArtisanStatusLog;
use App\Models\UserTierLog;
use App\Services\WalletService;
use App\Support\StructuredAddress;
use Barryvdh\DomPDF\Facade\Pdf;

class SuperAdminController extends Controller
{
    private const ARTISAN_DOCUMENT_FIELDS = [
        'business_permit',
        'dti_registration',
        'valid_id',
        'tin_id',
    ];

    /**
     * Admin Dashboard - Platform overview
     */
    /**
     * Helper to calculate count and percentage growth
     */
    private function getMetric($model, $conditions = [], $dateColumn = 'created_at')
    {
        $query = $model::query();

        foreach ($conditions as $field => $value) {
            if ($value === null) {
                $query->whereNull($field);
            } else {
                $query->where($field, $value);
            }
        }

        $currentCount = $query->count();

        // Calculate count 30 days ago
        $previousQuery = $model::query();
        foreach ($conditions as $field => $value) {
             if ($value === null) {
                $previousQuery->whereNull($field);
            } else {
                $previousQuery->where($field, $value);
            }
        }
        $previousCount = $previousQuery->where($dateColumn, '<', now()->subDays(30))->count();

        $growth = 0;
        if ($previousCount > 0) {
            $growth = (($currentCount - $previousCount) / $previousCount) * 100;
        } elseif ($currentCount > 0) {
            $growth = 100; // 0 to something is 100% growth (technically infinite, but 100% represents "new")
        }

        return [
            'value' => $currentCount,
            'growth' => round($growth, 1),
            'trend' => $growth > 0 ? 'up' : ($growth < 0 ? 'down' : 'neutral')
        ];
    }

    /**
     * Admin Dashboard - Platform overview
     */
    public function dashboard()
    {
        $totalArtisans = $this->getMetric(User::class, ['role' => 'artisan']);
        
        // Buyers (role is 'buyer' or null)
        // We handle the OR condition manually for the metric since simpler array conditions won't calculate it easily
        $buyerCurrent = User::where(function($q) {
            $q->where('role', 'buyer')->orWhereNull('role');
        })->count();
        
        $buyerPrevious = User::where(function($q) {
            $q->where('role', 'buyer')->orWhereNull('role');
        })->where('created_at', '<', now()->subDays(30))->count();

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


        // Pending Artisans (Accurate Historical Check)
        $currentPending = User::where('role', 'artisan')->where('artisan_status', 'pending')->count();
        $previousPending = $this->getHistoricalStatusCount('pending', 30);
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
        
        // Approved Artisans (Accurate Historical Check)
        $currentApproved = User::where('role', 'artisan')->where('artisan_status', 'approved')->count();
        $previousApproved = $this->getHistoricalStatusCount('approved', 30);
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

        // Recent registrations
        $recentUsers = User::with('sellerOwner:id,name,shop_name')
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

        return Inertia::render('Admin/Dashboard', [
            'stats' => [
                'totalArtisans' => $totalArtisans,
                'totalBuyers' => $totalBuyers,
                'pendingArtisans' => $pendingArtisans,
                'approvedArtisans' => $approvedArtisans,
                'rejectedArtisans' => $rejectedArtisans,
            ],
            'recentUsers' => $recentUsers,
        ]);
    }

    /**
     * Monetization Dashboard
     */
    public function monetization(WalletService $walletService)
    {
        // Pricing constants based on system logic
        $premiumPrice = 199;
        $elitePrice = 399;

        // Current Active Subscriptions
        $premiumUsersCount = User::where('role', 'artisan')->where('premium_tier', 'premium')->count();
        $eliteUsersCount = User::where('role', 'artisan')->where('premium_tier', 'super_premium')->count();
        $freeUsersCount = User::where('role', 'artisan')->where(function($q) {
            $q->where('premium_tier', 'free')->orWhereNull('premium_tier');
        })->count();

        // Projected plan MRR based on the current active artisan plan mix.
        $projectedMrr = ($premiumUsersCount * $premiumPrice) + ($eliteUsersCount * $elitePrice);

        // Previous month's active subscriptions (estimated using exact historical log tables)
        $previousPremiumUsersCount = $this->getHistoricalTierCount('premium', 30);
        $previousEliteUsersCount = $this->getHistoricalTierCount('super_premium', 30);
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

        // Sponsorships Metrics
        // Note: Sponsorships use credits included in the Elite plan, so this isn't direct revenue, but usage tracking.
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

        // Recent plan changes backed by the subscription tier audit log.
        $recentSubscribers = UserTierLog::query()
            ->with('user:id,name,shop_name,avatar,premium_tier')
            ->whereNotNull('new_tier')
            ->latest()
            ->limit(5)
            ->get()
            ->map(function($log) {
                $user = $log->user;

                if (!$user) {
                    return null;
                }

                $formatTierLabel = static function (?string $tier): string {
                    return match ($tier) {
                        'super_premium' => 'Elite',
                        'premium' => 'Premium',
                        'free', null, '' => 'Free',
                        default => ucfirst(str_replace('_', ' ', (string) $tier)),
                    };
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

        // Recent Sponsorships
        $recentSponsorships = SponsorshipRequest::with(['user:id,name,shop_name,avatar,premium_tier', 'product:id,name'])
            ->orderBy('created_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function($req) {
                return [
                    'id' => $req->id,
                    'user' => $req->user,
                    'product_name' => $req->product->name,
                    'status' => $req->status,
                    'date' => $req->created_at->format('M d, Y h:i A')
                ];
            });

        return Inertia::render('Admin/Monetization', [
            'metrics' => [
                'mrr' => $mrrMetric,
                'sponsorships' => $sponsorshipMetric,
                'subscribers' => [
                    'free' => $freeUsersCount,
                    'premium' => $premiumUsersCount,
                    'elite' => $eliteUsersCount,
                    'total_paid' => $premiumUsersCount + $eliteUsersCount,
                ],
                'pendingSponsorships' => $pendingSponsorships,
            ],
            'recentSubscribers' => $recentSubscribers,
            'recentSponsorships' => $recentSponsorships,
            'platformWallet' => $walletService->buildPlatformSnapshot(8),
        ]);
    }

    /**
     * All Users List with filtering
     */
    public function users(Request $request)
    {
        $search = trim((string) $request->get('search', ''));
        $roleFilter = $this->normalizeAdminUserRoleFilter((string) $request->get('role', 'all'));

        $query = User::query()
            ->where(function ($primaryQuery) {
                $primaryQuery->whereIn('role', ['artisan', 'buyer', 'super_admin'])
                    ->orWhereNull('role');
            })
            ->withCount('staffMembers')
            ->with([
                'staffMembers' => function ($staffQuery) {
                    $staffQuery
                        ->select([
                            'id',
                            'name',
                            'email',
                            'avatar',
                            'role',
                            'seller_owner_id',
                            'staff_role_preset_key',
                            'staff_module_permissions',
                            'must_change_password',
                            'employee_id',
                            'email_verified_at',
                            'created_at',
                        ])
                        ->with('employee:id,name')
                        ->orderBy('name');
                },
            ]);

        // Filter by role
        if ($roleFilter === 'artisan') {
            $query->where('role', 'artisan');
        } elseif ($roleFilter === 'buyer') {
            $query->where(function($q) {
                $q->where('role', 'buyer')->orWhereNull('role');
            });
        } elseif ($roleFilter === 'super_admin') {
            $query->where('role', 'super_admin');
        }

        // Search
        if ($search !== '') {
            $likeSearch = "%{$search}%";

            $query->where(function($q) use ($likeSearch) {
                $q->where('name', 'like', $likeSearch)
                  ->orWhere('email', 'like', $likeSearch)
                  ->orWhere('shop_name', 'like', $likeSearch)
                  ->orWhereHas('staffMembers', function ($staffQuery) use ($likeSearch) {
                      $staffQuery->where(function ($nestedQuery) use ($likeSearch) {
                          $nestedQuery->where('name', 'like', $likeSearch)
                              ->orWhere('email', 'like', $likeSearch)
                              ->orWhereHas('employee', function ($employeeQuery) use ($likeSearch) {
                                  $employeeQuery->where('name', 'like', $likeSearch);
                              });
                      });
                  });
            });
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate(20)
            ->withQueryString()
            ->through(function (User $user) use ($search) {
                return $this->mapAdminPrimaryAccount($user, $search);
            });

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'filters' => [
                'role' => $roleFilter,
                'search' => $search ?? '',
            ],
            'unlinkedStaffGroup' => $this->buildUnlinkedStaffGroup($search, $roleFilter),
        ]);
    }

    private function normalizeAdminUserRoleFilter(string $roleFilter): string
    {
        return in_array($roleFilter, ['all', 'artisan', 'buyer', 'super_admin'], true)
            ? $roleFilter
            : 'all';
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAdminPrimaryAccount(User $user, string $search): array
    {
        [$accountState, $accountStateTone] = $this->resolveAdminAccountState($user);

        $payload = [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $user->role ?? 'buyer',
            'shop_name' => $user->shop_name,
            'shop_slug' => $user->shop_slug,
            'artisan_status' => $user->artisan_status,
            'email_verified' => $user->hasVerifiedEmail(),
            'email_verified_at' => $user->email_verified_at?->format('M d, Y'),
            'account_state' => $accountState,
            'account_state_tone' => $accountStateTone,
            'created_at' => $user->created_at->format('M d, Y'),
            'avatar' => $user->avatar,
            'premium_tier' => $user->premium_tier,
            'staff_members' => [],
            'staff_count' => 0,
            'matched_staff_count' => 0,
        ];

        if (!$user->isArtisan()) {
            return $payload;
        }

        $allStaffMembers = $user->staffMembers ?? collect();
        $matchingStaffMembers = $search === ''
            ? collect()
            : $allStaffMembers
                ->filter(fn (User $staffMember) => $this->matchesAdminStaffSearch($staffMember, $search))
                ->values();
        $primaryMatchesSearch = $search !== '' && $this->matchesAdminPrimaryAccountSearch($user, $search);
        $staffMembersToDisplay = $search !== '' && !$primaryMatchesSearch && $matchingStaffMembers->isNotEmpty()
            ? $matchingStaffMembers
            : $allStaffMembers;

        $payload['staff_members'] = $staffMembersToDisplay
            ->map(fn (User $staffMember) => $this->mapAdminStaffMember($staffMember))
            ->values()
            ->all();
        $payload['staff_count'] = (int) ($user->staff_members_count ?? $allStaffMembers->count());
        $payload['matched_staff_count'] = $matchingStaffMembers->count();

        return $payload;
    }

    /**
     * @return array<string, mixed>
     */
    private function mapAdminStaffMember(User $staffMember): array
    {
        [$accountState, $accountStateTone] = $this->resolveAdminAccountState($staffMember);

        return [
            'id' => $staffMember->id,
            'name' => $staffMember->name,
            'email' => $staffMember->email,
            'avatar' => $staffMember->avatar,
            'email_verified' => $staffMember->hasVerifiedEmail(),
            'workspace_access_enabled' => $staffMember->isWorkspaceAccessEnabled(),
            'account_state' => $accountState,
            'account_state_tone' => $accountStateTone,
            'employee_name' => $staffMember->employee?->name,
            'employee_linked' => $staffMember->employee !== null,
            'staff_role_preset_key' => $staffMember->staff_role_preset_key ?: 'custom',
            'staff_user_level' => $staffMember->getStaffUserLevel(),
            'requires_password_change' => $staffMember->requiresStaffPasswordChange(),
            'created_at' => $staffMember->created_at->format('M d, Y'),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function buildUnlinkedStaffGroup(string $search, string $roleFilter): ?array
    {
        if (!in_array($roleFilter, ['all', 'artisan'], true)) {
            return null;
        }

        $baseQuery = User::query()
            ->where('role', 'staff')
            ->where(function ($query) {
                $query->whereNull('seller_owner_id')
                    ->orWhereDoesntHave('sellerOwner');
            });

        $staffCount = (clone $baseQuery)->count();

        if ($staffCount === 0) {
            return null;
        }

        $visibleStaffQuery = (clone $baseQuery)
            ->with('employee:id,name')
            ->orderBy('name');

        if ($search !== '') {
            $likeSearch = "%{$search}%";

            $visibleStaffQuery->where(function ($query) use ($likeSearch) {
                $query->where('name', 'like', $likeSearch)
                    ->orWhere('email', 'like', $likeSearch)
                    ->orWhereHas('employee', function ($employeeQuery) use ($likeSearch) {
                        $employeeQuery->where('name', 'like', $likeSearch);
                    });
            });
        }

        $visibleStaffMembers = $visibleStaffQuery->get();

        if ($visibleStaffMembers->isEmpty()) {
            return null;
        }

        return [
            'id' => 'unlinked-staff',
            'label' => 'Unlinked Staff',
            'description' => 'Staff accounts that are missing a valid shop owner link.',
            'staff_count' => $staffCount,
            'matched_staff_count' => $search !== '' ? $visibleStaffMembers->count() : 0,
            'staff_members' => $visibleStaffMembers
                ->map(fn (User $staffMember) => $this->mapAdminStaffMember($staffMember))
                ->values()
                ->all(),
        ];
    }

    private function matchesAdminPrimaryAccountSearch(User $user, string $search): bool
    {
        return $this->matchesSearchValue($user->name, $search)
            || $this->matchesSearchValue($user->email, $search)
            || $this->matchesSearchValue($user->shop_name, $search);
    }

    private function matchesAdminStaffSearch(User $staffMember, string $search): bool
    {
        return $this->matchesSearchValue($staffMember->name, $search)
            || $this->matchesSearchValue($staffMember->email, $search)
            || $this->matchesSearchValue($staffMember->employee?->name, $search);
    }

    private function matchesSearchValue(?string $value, string $search): bool
    {
        if ($value === null || $search === '') {
            return false;
        }

        return str_contains(mb_strtolower($value), mb_strtolower($search));
    }

    private function resolveAdminRoleLabel(User $user): string
    {
        if ($user->isArtisan()) {
            return 'Artisan';
        }

        if ($user->isStaff()) {
            return 'Staff';
        }

        if ($user->isAdmin()) {
            return 'Admin';
        }

        return 'Buyer';
    }

    private function resolveAdminAccountState(User $user): array
    {
        if ($user->isStaff()) {
            if (!$user->isWorkspaceAccessEnabled()) {
                return ['Access Suspended', 'neutral'];
            }

            if (!$user->hasVerifiedEmail()) {
                return ['Verification Pending', 'warning'];
            }

            if ($user->requiresStaffPasswordChange()) {
                return ['Password Reset Required', 'warning'];
            }

            return ['Access Active', 'success'];
        }

        if ($user->isArtisan()) {
            return match ($user->artisan_status) {
                'approved' => ['Approved', 'success'],
                'rejected' => ['Rejected', 'danger'],
                default => ['Pending', 'warning'],
            };
        }

        if ($user->isAdmin()) {
            return ['Platform Access', 'neutral'];
        }

        return [$user->hasVerifiedEmail() ? 'Verified' : 'Unverified', $user->hasVerifiedEmail() ? 'success' : 'warning'];
    }

    /**
     * Pending Artisan Applications
     */
    public function pendingArtisans()
    {
        $artisans = User::where('role', 'artisan')
            ->where('artisan_status', 'pending')
            ->whereNotNull('setup_completed_at')
            ->orderBy('setup_completed_at', 'asc')
            ->get()
            ->map(function($user) {
                $address = StructuredAddress::formatPhilippineAddress([
                    'street_address' => $user->street_address,
                    'barangay' => $user->barangay,
                    'city' => $user->city,
                    'region' => $user->region,
                    'postal_code' => $user->zip_code,
                ]);

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'shop_name' => $user->shop_name,
                    'phone_number' => $user->phone_number,
                    'address' => $address,
                    'business_permit' => $user->business_permit ? asset('storage/' . $user->business_permit) : null,
                    'dti_registration' => $user->dti_registration ? asset('storage/' . $user->dti_registration) : null,
                    'valid_id' => $user->valid_id ? asset('storage/' . $user->valid_id) : null,
                    'tin_id' => $user->tin_id ? asset('storage/' . $user->tin_id) : null,
                    'viewed_document_keys' => $this->getViewedArtisanDocumentKeys($user),
                    'submitted_at' => $user->setup_completed_at->format('M d, Y h:i A'),
                ];
            });

        return Inertia::render('Admin/PendingArtisans', [
            'artisans' => $artisans,
        ]);
    }

    /**
     * Approve an artisan application
     */
    public function approveArtisan($id)
    {
        $artisan = $this->findPendingArtisanOrFail($id);

        ArtisanStatusLog::create([
            'user_id' => $artisan->id,
            'previous_status' => $artisan->artisan_status,
            'new_status' => 'approved',
        ]);

        $artisan->update([
            'artisan_status' => 'approved',
            'approved_at' => now(),
            'approved_by' => Auth::id(),
            'artisan_rejection_reason' => null,
        ]);

        $this->clearViewedArtisanDocumentKeys($artisan);

        // Send approval email
        try {
            if ($artisan->email) {
                Mail::to($artisan->email)->queue(new ArtisanApproved($artisan));
            }
        } catch (\Exception $e) {
            // Log error but continue
            \Illuminate\Support\Facades\Log::error('Failed to send approval email: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Artisan approved successfully!');
    }

    /**
     * Reject an artisan application
     */
    public function rejectArtisan(Request $request, $id)
    {
        $request->validate([
            'reason' => 'required|string|min:10|max:1000',
        ]);

        $artisan = $this->findPendingArtisanOrFail($id);

        ArtisanStatusLog::create([
            'user_id' => $artisan->id,
            'previous_status' => $artisan->artisan_status,
            'new_status' => 'rejected',
        ]);

        $artisan->update([
            'artisan_status' => 'rejected',
            'artisan_rejection_reason' => $request->reason,
        ]);

        $this->clearViewedArtisanDocumentKeys($artisan);

        // Send rejection email
        try {
            if ($artisan->email) {
                Mail::to($artisan->email)->queue(new ArtisanRejected($artisan));
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send rejection email: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Artisan application rejected.');
    }

    public function markArtisanDocumentViewed(Request $request, $id)
    {
        $artisan = $this->findPendingArtisanOrFail($id);
        $requiredDocumentKeys = $this->getSubmittedArtisanDocumentKeys($artisan);

        $validated = $request->validate([
            'document' => 'required|string',
        ]);

        if (!in_array($validated['document'], $requiredDocumentKeys, true)) {
            throw ValidationException::withMessages([
                'document' => 'The selected document is not available for this artisan application.',
            ]);
        }

        $viewedDocumentKeys = collect($this->getViewedArtisanDocumentKeys($artisan))
            ->push($validated['document'])
            ->unique()
            ->values()
            ->all();

        session([
            $this->artisanDocumentReviewSessionKey($artisan->id) => $viewedDocumentKeys,
        ]);

        return response()->json([
            'viewed_document_keys' => $viewedDocumentKeys,
        ]);
    }

    /**
     * View a single artisan's details (for document review)
     */
    public function viewArtisan($id)
    {
        $artisan = User::where('role', 'artisan')->findOrFail($id);
        $address = StructuredAddress::formatPhilippineAddress([
            'street_address' => $artisan->street_address,
            'barangay' => $artisan->barangay,
            'city' => $artisan->city,
            'region' => $artisan->region,
            'postal_code' => $artisan->zip_code,
        ]);

        return Inertia::render('Admin/ViewArtisan', [
            'artisan' => [
                'id' => $artisan->id,
                'name' => $artisan->name,
                'email' => $artisan->email,
                'shop_name' => $artisan->shop_name,
                'phone_number' => $artisan->phone_number,
                'address' => $address,
                'artisan_status' => $artisan->artisan_status,
                'artisan_rejection_reason' => $artisan->artisan_rejection_reason,
                'business_permit' => $artisan->business_permit ? asset('storage/' . $artisan->business_permit) : null,
                'dti_registration' => $artisan->dti_registration ? asset('storage/' . $artisan->dti_registration) : null,
                'valid_id' => $artisan->valid_id ? asset('storage/' . $artisan->valid_id) : null,
                'tin_id' => $artisan->tin_id ? asset('storage/' . $artisan->tin_id) : null,
                'submitted_at' => $artisan->setup_completed_at?->format('M d, Y h:i A'),
                'approved_at' => $artisan->approved_at?->format('M d, Y h:i A'),
            ],
        ]);
    }

    private function findPendingArtisanOrFail(int|string $id): User
    {
        return User::where('role', 'artisan')
            ->where('artisan_status', 'pending')
            ->whereNotNull('setup_completed_at')
            ->findOrFail($id);
    }

    private function getSubmittedArtisanDocumentKeys(User $artisan): array
    {
        return collect(self::ARTISAN_DOCUMENT_FIELDS)
            ->filter(fn (string $field) => !empty($artisan->{$field}))
            ->values()
            ->all();
    }

    private function getViewedArtisanDocumentKeys(User $artisan): array
    {
        return collect(session($this->artisanDocumentReviewSessionKey($artisan->id), []))
            ->filter(fn ($field) => in_array($field, $this->getSubmittedArtisanDocumentKeys($artisan), true))
            ->values()
            ->all();
    }

    private function clearViewedArtisanDocumentKeys(User $artisan): void
    {
        session()->forget($this->artisanDocumentReviewSessionKey($artisan->id));
    }

    private function artisanDocumentReviewSessionKey(int $artisanId): string
    {
        return sprintf('admin.pending_artisan_document_views.%s.%s', Auth::id(), $artisanId);
    }

    /**
     * Advanced DSS Insights Dashboard
     */
    public function insights()
    {
        $premiumPrice = 199;
        $elitePrice   = 399;

        // ---- 1. REVENUE FORECASTING: last 6 months of estimated MRR ----
        $mrrHistory = [];
        for ($i = 5; $i >= 0; $i--) {
            $targetDate = now()->subMonths($i)->endOfMonth();
            $label      = $targetDate->format('M Y');

            $tierSnapshot = $this->getHistoricalTierSnapshot($targetDate);
            $premiumCount = $tierSnapshot['premium'];
            $eliteCount = $tierSnapshot['super_premium'];

            $mrrHistory[] = [
                'month'  => $label,
                'mrr'    => ($premiumCount * $premiumPrice) + ($eliteCount * $elitePrice),
                'premium' => $premiumCount,
                'elite'   => $eliteCount,
            ];
        }

        // Simple linear forecast: avg growth of last 3 months
        $last3 = array_slice($mrrHistory, -3);
        $growthRates = [];
        for ($i = 1; $i < count($last3); $i++) {
            $prev = $last3[$i - 1]['mrr'];
            $curr = $last3[$i]['mrr'];
            if ($prev > 0) {
                $growthRates[] = ($curr - $prev) / $prev;
            }
        }
        $avgGrowthRate  = count($growthRates) > 0 ? array_sum($growthRates) / count($growthRates) : 0;
        $currentMRR     = end($mrrHistory)['mrr'];
        $forecastedMRR  = round($currentMRR * (1 + $avgGrowthRate));

        // ---- 2. CHURN & ENGAGEMENT: segment artisans by last_seen_at ----
        $artisanQuery = User::where('role', 'artisan')->where('artisan_status', 'approved');

        $activeArtisans  = (clone $artisanQuery)->where('last_seen_at', '>=', now()->subDays(30))->count();
        $atRiskArtisans  = (clone $artisanQuery)
            ->where('last_seen_at', '<',  now()->subDays(30))
            ->where('last_seen_at', '>=', now()->subDays(60))
            ->count();
        $churnedArtisans = (clone $artisanQuery)
            ->where(function ($q) {
                $q->where('last_seen_at', '<', now()->subDays(60))
                  ->orWhereNull('last_seen_at');
            })->count();

        // Top 5 at-risk artisans for action list
        $atRiskList = User::where('role', 'artisan')
            ->where('artisan_status', 'approved')
            ->where('last_seen_at', '<',  now()->subDays(30))
            ->where('last_seen_at', '>=', now()->subDays(60))
            ->orderBy('last_seen_at', 'asc')
            ->limit(5)
            ->get(['id', 'name', 'shop_name', 'avatar', 'last_seen_at', 'premium_tier'])
            ->map(fn ($u) => [
                'id'          => $u->id,
                'name'        => $u->name,
                'shop_name'   => $u->shop_name,
                'avatar'      => $u->avatar,
                'premium_tier'=> $u->premium_tier,
                'last_seen'   => $u->last_seen_at?->diffForHumans(),
            ]);

        // ---- 3. CATEGORY PERFORMANCE ----
        $categoryStats = DB::table('order_items')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->where('orders.status', 'Completed')
            ->select(
                'products.category',
                DB::raw('SUM(order_items.quantity) as units_sold'),
                DB::raw('SUM(order_items.price * order_items.quantity) as gmv')
            )
            ->groupBy('products.category')
            ->orderByDesc('gmv')
            ->limit(10)
            ->get()
            ->map(fn ($row) => [
                'category'   => $row->category,
                'units_sold' => (int) $row->units_sold,
                'gmv'        => (float) $row->gmv,
            ]);

        // ---- 4. PLATFORM HEALTH SNAPSHOT ----
        $totalOrders     = Order::count();
        $completedOrders = Order::where('status', 'Completed')->count();
        $completionRate  = $totalOrders > 0 ? round(($completedOrders / $totalOrders) * 100, 1) : 0;

        $totalRevenue = Order::where('status', 'Completed')->sum('total_amount');
        $aov          = $completedOrders > 0 ? round($totalRevenue / $completedOrders, 2) : 0;

        $totalReviews   = Review::count();
        $reviewRate     = $completedOrders > 0
            ? round(($totalReviews / $completedOrders) * 100, 1)
            : 0;

        $refundedOrders = Order::where('status', 'Refunded')->count();
        $refundRate = $totalOrders > 0 ? round(($refundedOrders / $totalOrders) * 100, 1) : 0;

        return Inertia::render('Admin/Insights', [
            'revenue' => [
                'history'      => $mrrHistory,
                'currentMRR'   => $currentMRR,
                'forecastedMRR'=> $forecastedMRR,
                'growthRate'   => round($avgGrowthRate * 100, 1),
            ],
            'churn' => [
                'active'  => $activeArtisans,
                'atRisk'  => $atRiskArtisans,
                'churned' => $churnedArtisans,
                'atRiskList' => $atRiskList,
            ],
            'categories' => $categoryStats,
            'health' => [
                'completionRate'     => $completionRate,
                'aov'                => $aov,
                'reviewRate'         => $reviewRate,
                'refundRate'         => $refundRate,
                'totalOrders'        => $totalOrders,
                'completedOrders'    => $completedOrders,
            ],
        ]);
    }

    /**
     * Get the accurate historical count of a premium tier at a specific point in time.
     */
    private function getHistoricalTierCount($tier, $daysAgo = 30)
    {
        $snapshot = $this->getHistoricalTierSnapshot(now()->subDays($daysAgo));

        return $snapshot[$tier] ?? 0;
    }

    /**
     * Get the accurate historical count of an artisan status at a specific point in time.
     */
    private function getHistoricalStatusCount($status, $daysAgo = 30)
    {
        $statusLogs = ArtisanStatusLog::query()
            ->whereIn('user_id', $this->artisanIds())
            ->where('created_at', '<=', now()->subDays($daysAgo))
            ->orderBy('user_id')
            ->orderByDesc('created_at')
            ->get()
            ->unique('user_id');

        return $statusLogs->where('new_status', $status)->count();
    }

    /**
     * @return \Illuminate\Support\Collection<int, int>
     */
    private function artisanIds(): Collection
    {
        static $artisanIds;

        if ($artisanIds instanceof Collection) {
            return $artisanIds;
        }

        $artisanIds = User::where('role', 'artisan')->pluck('id');

        return $artisanIds;
    }

    /**
     * @return array<string, int>
     */
    private function getHistoricalTierSnapshot($targetDate): array
    {
        $tierLogs = UserTierLog::query()
            ->whereIn('user_id', $this->artisanIds())
            ->where('created_at', '<=', $targetDate)
            ->orderBy('user_id')
            ->orderByDesc('created_at')
            ->get()
            ->unique('user_id');

        return [
            'premium' => $tierLogs->where('new_tier', 'premium')->count(),
            'super_premium' => $tierLogs->where('new_tier', 'super_premium')->count(),
        ];
    }
}
