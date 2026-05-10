<?php

namespace App\Http\Controllers;

use App\Notifications\ReviewModerationStatusNotification;
use App\Models\User;
use App\Models\Order;
use App\Models\Product;
use App\Models\Review;
use App\Models\ReviewDispute;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use App\Models\SponsorshipRequest;
use App\Mail\ArtisanApproved;
use App\Mail\ArtisanRejected;
use App\Models\ArtisanStatusLog;
use App\Models\Category;
use App\Models\PlatformActivity;
use App\Models\SystemAnnouncement;
use App\Models\UserTierLog;
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
    private function getMetric(string $model, array $conditions = [], string $dateColumn = 'created_at')
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

        // Calculate total count as of 30 days ago
        $previousQuery = $model::query();
        foreach ($conditions as $field => $value) {
             if ($value === null) {
                $previousQuery->whereNull($field);
            } else {
                $previousQuery->where($field, $value);
            }
        }
        $previousCount = $previousQuery->where($dateColumn, '<=', now()->subDays(30))->count();

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
        try {
            $totalArtisans = $this->getMetric(User::class, ['role' => 'artisan']);
            
            // Buyers (role is 'buyer' or null)
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

            $activities = PlatformActivity::with('user:id,name,shop_name')->latest()->take(20)->get();

            return Inertia::render('Admin/Dashboard', [
                'stats' => [
                    'totalArtisans' => $totalArtisans,
                    'totalBuyers' => $totalBuyers,
                    'pendingArtisans' => $pendingArtisans,
                    'approvedArtisans' => $approvedArtisans,
                    'rejectedArtisans' => $rejectedArtisans,
                ],
                'recentUsers' => $recentUsers,
                'activities' => $activities,
            ]);
        } catch (\Throwable $e) {
            Log::error("SuperAdmin Dashboard error: " . $e->getMessage());
            return Inertia::render('Admin/Dashboard', [
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
                        'product_name' => $req->product->name ?? 'Unknown Product',
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
            ]);
        } catch (\Throwable $e) {
            Log::error("SuperAdmin Monetization error: " . $e->getMessage());
            return Inertia::render('Admin/Monetization', [
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
     * All Users List with filtering
     */
    public function users(Request $request)
    {
        try {
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
                ->paginate(10)
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
        } catch (\Throwable $e) {
            Log::error("SuperAdmin Users error: " . $e->getMessage());
            return Inertia::render('Admin/Users', [
                'users' => [
                    'data' => [],
                    'links' => [],
                    'current_page' => 1,
                    'last_page' => 1,
                    'total' => 0
                ],
                'filters' => [
                    'role' => 'all',
                    'search' => '',
                ],
                'unlinkedStaffGroup' => null,
                'db_error' => true
            ]);
        }
    }

    public function reviewModeration()
    {
        $disputes = ReviewDispute::query()
            ->with(['review.product.user', 'reporter'])
            ->latest()
            ->get()
            ->map(function (ReviewDispute $dispute) {
                $review = $dispute->review;
                $product = $review?->product;
                $shopOwner = $product?->user;

                return [
                    'id' => $dispute->id,
                    'status' => $dispute->status,
                    'reason' => $dispute->reason,
                    'details' => $dispute->details ?? $dispute->explanation,
                    'resolution_notes' => $dispute->resolution_notes,
                    'reported_at' => $dispute->created_at?->toIso8601String(),
                    'resolved_at' => $dispute->resolved_at?->toIso8601String(),
                    'reported_by' => $dispute->reporter?->name ?? 'Unknown user',
                    'shop_name' => $shopOwner?->shop_name ?? $shopOwner?->name ?? 'Unknown shop',
                    'product_name' => $product?->name ?? 'Unknown product',
                    'product_slug' => $product?->slug,
                    'product_id' => $product?->id,
                    'review_id' => $review?->id,
                    'review_rating' => $review?->rating,
                    'review_comment' => $review?->comment,
                    'review_hidden_from_marketplace' => (bool) ($review?->is_hidden_from_marketplace ?? false),
                ];
            })
            ->values();

        return Inertia::render('Admin/ReviewModeration', [
            'disputes' => $disputes,
        ]);
    }

    public function updateReviewModeration(Request $request, ReviewDispute $reviewDispute)
    {
        $validated = $request->validate([
            'status' => 'required|in:under_review,resolved,rejected',
            'resolution_notes' => 'nullable|string|max:1000',
        ]);

        $resolvedStatuses = ['resolved', 'rejected'];
        $reviewDispute->loadMissing('review');

        DB::transaction(function () use ($request, $reviewDispute, $validated, $resolvedStatuses) {
            $reviewDispute->update([
                'status' => $validated['status'],
                'resolution_notes' => $validated['resolution_notes'] ?: null,
                'resolved_at' => in_array($validated['status'], $resolvedStatuses, true) ? now() : null,
            ]);

            if (!$reviewDispute->review) {
                return;
            }

            $this->syncReviewMarketplaceVisibility($reviewDispute->review, $request->user()?->id);

            if (in_array($validated['status'], $resolvedStatuses, true) && $reviewDispute->review->user) {
                $reviewDispute->review->user->notify(
                    new ReviewModerationStatusNotification(
                        $reviewDispute->review,
                        (bool) $reviewDispute->review->fresh()->is_hidden_from_marketplace,
                    )
                );
            }
        });

        return back()->with('success', 'Moderation request updated.');
    }

    public function destroyReviewModeration(Request $request, ReviewDispute $reviewDispute)
    {
        $reviewDispute->loadMissing('review');

        DB::transaction(function () use ($request, $reviewDispute) {
            $review = $reviewDispute->review;

            $reviewDispute->delete();

            if ($review) {
                $this->syncReviewMarketplaceVisibility($review, $request->user()?->id);
            }
        });

        return back()->with('success', 'Moderation request removed.');
    }

    private function syncReviewMarketplaceVisibility(Review $review, ?int $moderatorId = null): void
    {
        $review->loadMissing('product');

        $hasApprovedDispute = $review->disputes()
            ->where('status', 'resolved')
            ->exists();

        $review->update([
            'is_hidden_from_marketplace' => $hasApprovedDispute,
            'hidden_at' => $hasApprovedDispute ? ($review->hidden_at ?? now()) : null,
            'hidden_by' => $hasApprovedDispute ? ($review->hidden_by ?? $moderatorId) : null,
            'is_pinned' => $hasApprovedDispute ? false : $review->is_pinned,
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
            'can_manage_staff_accounts' => $staffMember->hasStaffManagementPermission(),
            'staff_access_permission_level' => $staffMember->getStaffAccessPermissionLevel(),
            'module_permissions' => User::stripStaffControlFlags((array) $staffMember->staff_module_permissions),
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
                $submittedDocumentKeys = $this->getSubmittedArtisanDocumentKeys($user);
                $viewedDocumentKeys = $this->getViewedArtisanDocumentKeys($user);
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
                    'viewed_document_keys' => $viewedDocumentKeys,
                    'submitted_document_count' => count($submittedDocumentKeys),
                    'viewed_document_count' => count($viewedDocumentKeys),
                    'documents_ready_for_approval' => count($submittedDocumentKeys) > 0
                        && count($submittedDocumentKeys) === count($viewedDocumentKeys),
                    'submitted_at' => $user->setup_completed_at->format('M d, Y h:i A'),
                    'document_flags' => $user->document_flags ?? [],
                ];
            });

        return Inertia::render('Admin/PendingArtisans', [
            'artisans' => $artisans,
        ]);
    }

    /**
     * Approve an artisan application
     */
    public function approveArtisan(int|string $id)
    {
        $artisan = $this->findPendingArtisanOrFail($id);
        $submittedDocumentKeys = $this->getSubmittedArtisanDocumentKeys($artisan);
        $viewedDocumentKeys = $this->getViewedArtisanDocumentKeys($artisan);

        if (count($submittedDocumentKeys) === 0 || count($submittedDocumentKeys) !== count($viewedDocumentKeys)) {
            throw ValidationException::withMessages([
                'documents' => 'Preview all submitted documents before approving this application.',
            ]);
        }

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
                $mailer = Mail::to($artisan->email);

                if (app()->environment('production') && config('queue.default') !== 'sync') {
                    $mailer->queue(new ArtisanApproved($artisan));
                } else {
                    $mailer->send(new ArtisanApproved($artisan));
                }
            }
        } catch (\Exception $e) {
            // Log error but continue
            Log::error('Failed to send approval email: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Artisan approved successfully!');
    }

    /**
     * Reject an artisan application
     */
    public function rejectArtisan(Request $request, int|string $id)
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
                $mailer = Mail::to($artisan->email);

                if (app()->environment('production') && config('queue.default') !== 'sync') {
                    $mailer->queue(new ArtisanRejected($artisan));
                } else {
                    $mailer->send(new ArtisanRejected($artisan));
                }
            }
        } catch (\Exception $e) {
            Log::error('Failed to send rejection email: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Artisan application rejected.');
    }

    public function markArtisanDocumentViewed(Request $request, int|string $id)
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
    public function viewArtisan(int|string $id)
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
        $targetDates = [];
        for ($i = 5; $i >= 0; $i--) {
            $targetDates[] = now()->subMonths($i)->endOfMonth();
        }

        $snapshots = $this->getHistoricalTierSnapshots($targetDates);
        $mrrHistory = [];

        foreach ($targetDates as $targetDate) {
            $label = $targetDate->format('M Y');
            $tierSnapshot = $snapshots[$label] ?? ['premium' => 0, 'super_premium' => 0];
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
    private function getHistoricalTierCount(string $tier, int $daysAgo = 30)
    {
        $snapshot = $this->getHistoricalTierSnapshot(now()->subDays($daysAgo));

        return $snapshot[$tier] ?? 0;
    }

    /**
     * Get the accurate historical count of an artisan status at a specific point in time.
     */
    private function getHistoricalStatusCount(string $status, int $daysAgo = 30)
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
     * @return array<string, array<string, int>>
     */
    private function getHistoricalTierSnapshots(array $targetDates): array
    {
        $snapshots = [];
        $artisanIds = $this->artisanIds();
        
        // Fetch all logs that could possibly affect the tiers for the given dates
        $maxDate = collect($targetDates)->max();
        $allLogs = UserTierLog::query()
            ->whereIn('user_id', $artisanIds)
            ->where('created_at', '<=', $maxDate)
            ->orderBy('user_id')
            ->orderByDesc('created_at')
            ->get()
            ->groupBy('user_id');

        foreach ($targetDates as $date) {
            $premiumCount = 0;
            $eliteCount = 0;

            foreach ($allLogs as $userId => $logs) {
                // Find the latest log before or on the target date
                /** @var \App\Models\UserTierLog|null $latestLog */
                $latestLog = $logs->first(fn(UserTierLog $log) => $log->created_at <= $date);
                
                if ($latestLog) {
                    if ($latestLog->new_tier === 'premium') {
                        $premiumCount++;
                    } elseif ($latestLog->new_tier === 'super_premium') {
                        $eliteCount++;
                    }
                }
            }

            $snapshots[$date->format('M Y')] = [
                'premium' => $premiumCount,
                'super_premium' => $eliteCount,
            ];
        }

        return $snapshots;
    }

    private function getHistoricalTierSnapshot(\DateTimeInterface|string $targetDate): array
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

    // --- SYSTEM ANNOUNCEMENTS ---

    public function announcements()
    {
        return Inertia::render('Admin/Announcements', [
            'announcements' => SystemAnnouncement::with('creator:id,name')->latest()->get(),
        ]);
    }

    public function storeAnnouncement(Request $request)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'icon_name' => 'nullable|string|max:50',
            'bg_color' => 'nullable|string|max:20',
            'text_color' => 'nullable|string|max:20',
            'action_text' => 'nullable|string|max:50',
            'action_url' => 'nullable|string|max:255',
            'type' => 'required|in:info,warning,danger,success,custom',
            'target_audience' => 'required|in:all,artisans,buyers',
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'display_duration' => 'nullable|integer|min:5|max:600',
        ]);

        $validated['created_by'] = Auth::id();

        if ($validated['is_active'] ?? false) {
            SystemAnnouncement::where('is_active', true)->update(['is_active' => false]);
        }

        SystemAnnouncement::create($validated);

        return back()->with('success', 'Announcement created successfully.');
    }

    public function updateAnnouncement(Request $request, SystemAnnouncement $announcement)
    {
        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'message' => 'required|string',
            'icon_name' => 'nullable|string|max:50',
            'bg_color' => 'nullable|string|max:20',
            'text_color' => 'nullable|string|max:20',
            'action_text' => 'nullable|string|max:50',
            'action_url' => 'nullable|string|max:255',
            'type' => 'required|in:info,warning,danger,success,custom',
            'target_audience' => 'required|in:all,artisans,buyers',
            'is_active' => 'boolean',
            'starts_at' => 'nullable|date',
            'expires_at' => 'nullable|date|after:starts_at',
            'display_duration' => 'nullable|integer|min:5|max:600',
        ]);

        if ($validated['is_active'] ?? false) {
            SystemAnnouncement::where('id', '!=', $announcement->id)->where('is_active', true)->update(['is_active' => false]);
        }

        $announcement->update($validated);

        return back()->with('success', 'Announcement updated successfully.');
    }

    public function destroyAnnouncement(SystemAnnouncement $announcement)
    {
        $announcement->delete();

        return back()->with('success', 'Announcement deleted successfully.');
    }

    public function broadcastAnnouncement(SystemAnnouncement $announcement)
    {
        SystemAnnouncement::where('is_active', true)->update(['is_active' => false]);
        $announcement->update([
            'is_active' => true,
            'broadcast_version' => ($announcement->broadcast_version ?? 0) + 1,
        ]);

        return back()->with('success', 'Announcement is now live across the platform.');
    }

    public function stopAnnouncement(SystemAnnouncement $announcement)
    {
        $announcement->update(['is_active' => false]);

        return back()->with('success', 'Broadcast stopped.');
    }

    // --- MODERATION QUEUE ---

    public function moderationQueue()
    {
        $flags = \App\Models\FlaggedContent::with(['reporter:id,name', 'reportable'])
            ->where('status', 'pending')
            ->latest()
            ->paginate(15);

        return Inertia::render('Admin/ModerationQueue', [
            'flags' => $flags
        ]);
    }

    public function resolveFlag(int|string $id, Request $request)
    {
        $flag = \App\Models\FlaggedContent::findOrFail($id);
        
        $flag->update([
            'status' => 'resolved',
            'resolved_by' => Auth::id(),
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'Content flag marked as resolved.');
    }

    public function takedownProduct(int|string $id, Request $request)
    {
        $flag = \App\Models\FlaggedContent::findOrFail($id);
        
        if ($flag->reportable_type === 'App\Models\Product' && $flag->reportable) {
            $flag->reportable->update(['status' => 'Rejected']);
        }

        $flag->update([
            'status' => 'resolved',
            'resolved_by' => Auth::id(),
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'Product taken down and flag resolved.');
    }

    public function suspendUser(int|string $id, Request $request)
    {
        $flag = \App\Models\FlaggedContent::findOrFail($id);
        
        $userId = null;
        if ($flag->reportable_type === 'App\Models\Product' && $flag->reportable) {
            $userId = $flag->reportable->user_id;
        } elseif ($flag->reportable_type === 'App\Models\User') {
            $userId = $flag->reportable_id;
        }

        if ($userId) {
            $user = User::find($userId);
            if ($user) {
                // Simplest suspension: flip them to a suspended status if exists, or remove permissions
                $user->update(['artisan_status' => 'rejected']); 
            }
        }

        $flag->update([
            'status' => 'resolved',
            'resolved_by' => Auth::id(),
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'User suspended and flag resolved.');
    }

    public function dismissFlag(int|string $id, Request $request)
    {
        $flag = \App\Models\FlaggedContent::findOrFail($id);
        
        $flag->update([
            'status' => 'dismissed',
            'resolved_by' => Auth::id(),
            'resolved_at' => now(),
        ]);

        return back()->with('success', 'Content flag dismissed.');
    }

    // --- SYSTEM DIAGNOSTICS & INFRASTRUCTURE ---

    public function diagnostics()
    {
        $cacheStatus = 'Online';
        $dbStatus = 'Online';
        $paymongoStatus = 'Unknown';
        
        try {
            DB::connection()->getPdo();
        } catch (\Exception $e) {
            $dbStatus = 'Offline';
        }

        try {
            Cache::has('test');
        } catch (\Exception $e) {
            $cacheStatus = 'Offline';
        }

        try {
            $secretKey = config('services.paymongo.secret_key');
            if ($secretKey) {
                $response = Http::withToken($secretKey)
                    ->get('https://api.paymongo.com/v1/links?limit=1');
                $paymongoStatus = $response->successful() ? 'Online' : 'Error';
            } else {
                $paymongoStatus = 'Unconfigured';
            }
        } catch (\Exception $e) {
            $paymongoStatus = 'Offline';
        }

        return Inertia::render('Admin/Diagnostics', [
            'systemHealth' => [
                'database' => $dbStatus,
                'cache' => $cacheStatus,
                'paymongo' => $paymongoStatus,
                'lalamove' => 'Unconfigured', // Placeholder
                'smtp' => config('mail.mailers.smtp.host') ? 'Configured' : 'Unconfigured',
                'environment' => config('app.env'),
                'debug_mode' => config('app.debug'),
            ],
            'queueStatus' => [
                'total_jobs' => DB::table('jobs')->count(),
                'failed_jobs' => DB::table('failed_jobs')->count(),
                'emails' => DB::table('jobs')->where('payload', 'like', '%Mail%')->orWhere('payload', 'like', '%Notification%')->count(),
                'reports' => DB::table('jobs')->where('payload', 'like', '%Report%')->count(),
                'images' => DB::table('jobs')->where('payload', 'like', '%Image%')->orWhere('payload', 'like', '%Process%')->count(),
            ],
            'memoryUsage' => round(memory_get_usage(true) / 1024 / 1024, 2),
            'peakMemoryUsage' => round(memory_get_peak_usage(true) / 1024 / 1024, 2),
        ]);
    }

    public function purgeCache()
    {
        Artisan::call('cache:clear');
        Artisan::call('view:clear');
        
        PlatformActivity::create([
            'user_id' => Auth::id(),
            'action' => 'system_cache_purged',
            'description' => 'Super Admin forcefully purged the application cache.',
        ]);

        return back()->with('success', 'System cache successfully purged. Memory is clear.');
    }

    // --- GLOBAL TAXONOMY ENGINE ---

    public function taxonomyIndex()
    {
        $categories = Category::withCount('products')->orderBy('name')->get();

        return Inertia::render('Admin/Taxonomy', [
            'categories' => $categories
        ]);
    }

    public function taxonomyStore(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name'
        ]);

        $category = Category::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name'])
        ]);

        return back()->with('success', 'Category created successfully.');
    }

    public function taxonomyUpdate(Request $request, Category $category)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:categories,name,' . $category->id
        ]);

        $oldName = $category->name;
        $newName = $validated['name'];

        $category->update([
            'name' => $newName,
            'slug' => Str::slug($newName)
        ]);

        // Mass update existing products
        Product::where('category', $oldName)->update(['category' => $newName]);

        return back()->with('success', 'Category renamed and all associated products updated.');
    }

    public function taxonomyDestroy(Category $category)
    {
        if ($category->products()->count() > 0) {
            return back()->with('error', 'Cannot delete a category that contains products. Please reassign the products first.');
        }

        $name = $category->name;


        $category->delete();

        return back()->with('success', 'Category deleted successfully.');
    }

    public function bulkApproveArtisans(Request $request)
    {
        $ids = $request->input('ids', []);
        $artisans = User::whereIn('id', $ids)->where('artisan_status', 'pending')->get();

        foreach ($artisans as $artisan) {
            $artisan->update([
                'artisan_status' => 'approved',
                'approved_at' => now(),
                'approved_by' => Auth::id(),
            ]);

        }

        return back()->with('success', count($artisans) . ' artisans approved.');
    }



    public function checkCategoryName(Request $request)
    {
        $exists = Category::where('name', $request->name)
            ->when($request->exclude_id, fn($q) => $q->where('id', '!=', $request->exclude_id))
            ->exists();

        return response()->json(['exists' => $exists]);
    }

    public function checkArtisanSlug(Request $request)
    {
        $exists = User::where('shop_slug', $request->slug)
            ->when($request->exclude_id, fn($q) => $q->where('id', '!=', $request->exclude_id))
            ->exists();

        return response()->json(['exists' => $exists]);
    }

    /**
     * SLA Monitoring - Platform Governance
     */
    public function slaMonitoring()
    {
        // Cache metrics for 30 minutes to reduce DB load
        $metrics = Cache::remember('admin_sla_metrics', 1800, function () {
            // 1. Artisan Approval SLA (Goal: 24h)
            // Use DB-level average for performance
            $avgApprovalTime = User::where('role', 'artisan')
                ->whereNotNull('approved_at')
                ->whereNotNull('setup_completed_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, setup_completed_at, approved_at)) as avg_hours')
                ->value('avg_hours') ?? 0;

            // 2. Dispute Resolution SLA (Goal: 48h)
            $avgDisputeTime = ReviewDispute::where('status', 'resolved')
                ->whereNotNull('resolved_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, created_at, resolved_at)) as avg_hours')
                ->value('avg_hours') ?? 0;

            // 3. Sponsorship SLA (Goal: 24h)
            $avgSponsorshipTime = SponsorshipRequest::where('status', 'approved')
                ->whereNotNull('approved_at')
                ->whereNotNull('requested_at')
                ->selectRaw('AVG(TIMESTAMPDIFF(HOUR, requested_at, approved_at)) as avg_hours')
                ->value('avg_hours') ?? 0;

            return [
                'avgArtisanApprovalHours' => round($avgApprovalTime, 1),
                'avgDisputeResolutionHours' => round($avgDisputeTime, 1),
                'avgSponsorshipApprovalHours' => round($avgSponsorshipTime, 1),
                'artisanSLACompliance' => $avgApprovalTime <= 24 ? 100 : max(0, round(100 - (($avgApprovalTime - 24) * 2), 1)),
                'disputeSLACompliance' => $avgDisputeTime <= 48 ? 100 : max(0, round(100 - (($avgDisputeTime - 48) * 1.5), 1)),
            ];
        });

        // Get stale items (not cached as these need to be live for resolution)
        $staleArtisanApplications = User::where('role', 'artisan')
            ->where('artisan_status', 'pending')
            ->where('setup_completed_at', '<=', now()->subHours(48))
            ->orderBy('setup_completed_at', 'asc')
            ->limit(50) // Limit to top 50 for performance
            ->get()
            ->map(fn($u) => [
                'id' => $u->id,
                'name' => $u->name,
                'shop_name' => $u->shop_name,
                'submitted_at' => $u->setup_completed_at->toIso8601String(),
                'hours_pending' => now()->diffInHours($u->setup_completed_at),
                'type' => 'Artisan Application',
                'priority' => now()->diffInHours($u->setup_completed_at) > 72 ? 'Critical' : 'High',
                'route' => route('admin.artisan.view', $u->id)
            ]);

        $staleDisputes = ReviewDispute::where('status', 'under_review')
            ->where('created_at', '<=', now()->subHours(48))
            ->orderBy('created_at', 'asc')
            ->limit(50)
            ->get()
            ->map(fn($d) => [
                'id' => $d->id,
                'name' => "Dispute #{$d->id}: {$d->reason}",
                'shop_name' => 'N/A',
                'submitted_at' => $d->created_at->toIso8601String(),
                'hours_pending' => now()->diffInHours($d->created_at),
                'type' => 'Review Dispute',
                'priority' => now()->diffInHours($d->created_at) > 96 ? 'Critical' : 'High',
                'route' => route('admin.review-moderation')
            ]);

        $staleSponsorships = SponsorshipRequest::where('status', 'pending')
            ->where('requested_at', '<=', now()->subHours(24))
            ->orderBy('requested_at', 'asc')
            ->limit(50)
            ->get()
            ->map(fn($s) => [
                'id' => $s->id,
                'name' => "Sponsorship Request #{$s->id}",
                'shop_name' => $s->user->shop_name ?? $s->user->name,
                'submitted_at' => $s->requested_at->toIso8601String(),
                'hours_pending' => now()->diffInHours($s->requested_at),
                'type' => 'Sponsorship',
                'priority' => now()->diffInHours($s->requested_at) > 48 ? 'Critical' : 'High',
                'route' => route('admin.sponsorships')
            ]);

        // 4. Combined Stale Queue
        $staleQueue = collect([])
            ->concat($staleArtisanApplications)
            ->concat($staleDisputes)
            ->concat($staleSponsorships)
            ->sortByDesc('hours_pending')
            ->values();

        return Inertia::render('Admin/SLA', [
            'metrics' => array_merge($metrics, ['totalStaleItems' => $staleQueue->count()]),
            'staleQueue' => $staleQueue,
        ]);
    }

    /**
     * Restoration Center (Trash) - Platform Governance
     */
    public function trash()
    {
        // Use pagination for trash to handle large datasets efficiently
        $deletedProducts = Product::onlyTrashed()
            ->with('user:id,name,shop_name')
            ->orderBy('deleted_at', 'desc')
            ->limit(100) // Performance safeguard
            ->get()
            ->map(fn($p) => [
                'id' => $p->id,
                'name' => $p->name,
                'type' => 'Product',
                'context' => $p->user->shop_name ?? $p->user->name,
                'deleted_at' => $p->deleted_at->toIso8601String(),
                'expires_at' => $p->deleted_at->addDays(30)->toIso8601String(),
            ]);

        $deletedCategories = Category::onlyTrashed()
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

        $deletedOrders = Order::onlyTrashed()
            ->with('user:id,name')
            ->orderBy('deleted_at', 'desc')
            ->limit(100)
            ->get()
            ->map(fn($o) => [
                'id' => $o->id,
                'name' => "Order #{$o->order_number}",
                'type' => 'Order',
                'context' => $o->user->name ?? 'Unknown Customer',
                'deleted_at' => $o->deleted_at->toIso8601String(),
                'expires_at' => $o->deleted_at->addDays(30)->toIso8601String(),
            ]);

        $trashQueue = collect([])
            ->concat($deletedProducts)
            ->concat($deletedCategories)
            ->concat($deletedOrders)
            ->sortByDesc('deleted_at')
            ->values();

        return Inertia::render('Admin/Trash', [
            'trashQueue' => $trashQueue,
            'stats' => [
                'totalItems' => $trashQueue->count(),
                'products' => Product::onlyTrashed()->count(),
                'categories' => Category::onlyTrashed()->count(),
                'orders' => Order::onlyTrashed()->count(),
            ]
        ]);
    }

    public function restoreItem(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required',
            'type' => 'required|in:Product,Category,Order',
        ]);

        $model = match($validated['type']) {
            'Product' => Product::class,
            'Category' => Category::class,
            'Order' => Order::class,
            default => null
        };

        if (!$model) {
            return back()->with('error', 'Invalid item type.');
        }

        $item = $model::onlyTrashed()->findOrFail($validated['id']);
        $item->restore();

        return back()->with('success', "{$validated['type']} restored successfully.");
    }

    public function permanentDeleteItem(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required',
            'type' => 'required|in:Product,Category,Order',
        ]);

        $model = match($validated['type']) {
            'Product' => Product::class,
            'Category' => Category::class,
            'Order' => Order::class,
            default => null
        };

        if (!$model) {
            return back()->with('error', 'Invalid item type.');
        }

        $item = $model::onlyTrashed()->findOrFail($validated['id']);
        $item->forceDelete();

        return back()->with('success', "{$validated['type']} permanently deleted.");
    }
}
