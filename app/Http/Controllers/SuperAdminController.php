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
use Inertia\Inertia;
use App\Models\SponsorshipRequest;
use App\Mail\ArtisanApproved;
use App\Mail\ArtisanRejected;
use App\Models\ArtisanStatusLog;
use App\Models\UserTierLog;
use Barryvdh\DomPDF\Facade\Pdf;

class SuperAdminController extends Controller
{
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
        $recentUsers = User::orderBy('created_at', 'desc')
            ->limit(10)
            ->get(['id', 'name', 'email', 'role', 'artisan_status', 'created_at', 'shop_name', 'avatar', 'premium_tier']);

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
    public function monetization()
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

        // Estimated MRR calculation
        $estimatedMRR = ($premiumUsersCount * $premiumPrice) + ($eliteUsersCount * $elitePrice);

        // Previous month's active subscriptions (estimated using exact historical log tables)
        $previousPremiumUsersCount = $this->getHistoricalTierCount('premium', 30);
        $previousEliteUsersCount = $this->getHistoricalTierCount('super_premium', 30);
        $previousEstimatedMRR = ($previousPremiumUsersCount * $premiumPrice) + ($previousEliteUsersCount * $elitePrice);

        $mrrGrowth = 0;
        if ($previousEstimatedMRR > 0) {
            $mrrGrowth = (($estimatedMRR - $previousEstimatedMRR) / $previousEstimatedMRR) * 100;
        } elseif ($estimatedMRR > 0) {
            $mrrGrowth = 100;
        }

        $mrrMetric = [
            'value' => $estimatedMRR,
            'growth' => round($mrrGrowth, 1),
            'trend' => $mrrGrowth > 0 ? 'up' : ($mrrGrowth < 0 ? 'down' : 'neutral')
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

        // Recent Upgrades (Approximation based on those currently with premium/elite tiers)
        $recentSubscribers = User::where('role', 'artisan')
            ->whereIn('premium_tier', ['premium', 'super_premium'])
            ->orderBy('updated_at', 'desc') // Using updated_at as a proxy for upgrade date since we don't have a transaction log
            ->limit(5)
            ->get(['id', 'name', 'shop_name', 'avatar', 'premium_tier', 'updated_at'])
            ->map(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'shop_name' => $user->shop_name,
                    'avatar' => $user->avatar,
                    'premium_tier' => $user->premium_tier,
                    'tier' => $user->premium_tier === 'super_premium' ? 'Elite' : 'Premium',
                    'date' => $user->updated_at->format('M d, Y h:i A')
                ];
            });

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
        ]);
    }

    /**
     * All Users List with filtering
     */
    public function users(Request $request)
    {
        $query = User::query();

        // Filter by role
        $roleFilter = $request->get('role', 'all');
        if ($roleFilter === 'artisan') {
            $query->where('role', 'artisan');
        } elseif ($roleFilter === 'buyer') {
            $query->where(function($q) {
                $q->where('role', 'buyer')->orWhereNull('role');
            });
        } elseif ($roleFilter === 'admin') {
            $query->where('role', 'super_admin');
        }

        // Search
        if ($search = $request->get('search')) {
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('shop_name', 'like', "%{$search}%");
            });
        }

        $users = $query->orderBy('created_at', 'desc')
            ->paginate(20)
            ->through(function($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role ?? 'buyer',
                    'shop_name' => $user->shop_name,
                    'artisan_status' => $user->artisan_status,
                    'email_verified_at' => $user->email_verified_at?->format('M d, Y'),
                    'created_at' => $user->created_at->format('M d, Y'),
                    'avatar' => $user->avatar,
                    'premium_tier' => $user->premium_tier,
                ];
            });

        return Inertia::render('Admin/Users', [
            'users' => $users,
            'filters' => [
                'role' => $roleFilter,
                'search' => $search ?? '',
            ],
        ]);
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
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'avatar' => $user->avatar,
                    'shop_name' => $user->shop_name,
                    'phone_number' => $user->phone_number,
                    'address' => $user->street_address . ', ' . $user->city . ' ' . $user->zip_code,
                    'business_permit' => $user->business_permit ? asset('storage/' . $user->business_permit) : null,
                    'dti_registration' => $user->dti_registration ? asset('storage/' . $user->dti_registration) : null,
                    'valid_id' => $user->valid_id ? asset('storage/' . $user->valid_id) : null,
                    'tin_id' => $user->tin_id ? asset('storage/' . $user->tin_id) : null,
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
        $artisan = User::where('role', 'artisan')
            ->where('artisan_status', 'pending')
            ->findOrFail($id);

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

        // Send approval email
        try {
            if ($artisan->email) {
                Mail::to($artisan->email)->send(new ArtisanApproved($artisan));
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

        $artisan = User::where('role', 'artisan')
            ->where('artisan_status', 'pending')
            ->findOrFail($id);

        ArtisanStatusLog::create([
            'user_id' => $artisan->id,
            'previous_status' => $artisan->artisan_status,
            'new_status' => 'rejected',
        ]);

        $artisan->update([
            'artisan_status' => 'rejected',
            'artisan_rejection_reason' => $request->reason,
        ]);

        // Send rejection email
        try {
            if ($artisan->email) {
                Mail::to($artisan->email)->send(new ArtisanRejected($artisan));
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Failed to send rejection email: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Artisan application rejected.');
    }

    /**
     * View a single artisan's details (for document review)
     */
    public function viewArtisan($id)
    {
        $artisan = User::where('role', 'artisan')->findOrFail($id);

        return Inertia::render('Admin/ViewArtisan', [
            'artisan' => [
                'id' => $artisan->id,
                'name' => $artisan->name,
                'email' => $artisan->email,
                'shop_name' => $artisan->shop_name,
                'phone_number' => $artisan->phone_number,
                'address' => $artisan->street_address . ', ' . $artisan->city . ' ' . $artisan->zip_code,
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

            // Count users on each tier at that point using tier logs
            $artisans = User::where('role', 'artisan')->get('id');
            $premiumCount = 0;
            $eliteCount   = 0;

            foreach ($artisans as $artisan) {
                $log = UserTierLog::where('user_id', $artisan->id)
                    ->where('created_at', '<=', $targetDate)
                    ->orderBy('created_at', 'desc')
                    ->first();
                $tier = $log ? $log->new_tier : 'free';
                if ($tier === 'premium')        $premiumCount++;
                elseif ($tier === 'super_premium') $eliteCount++;
            }

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
        $targetDate = now()->subDays($daysAgo);
        $users = User::where('role', 'artisan')->get();
        $count = 0;
        foreach ($users as $user) {
            $latestLog = UserTierLog::where('user_id', $user->id)
                ->where('created_at', '<=', $targetDate)
                ->orderBy('created_at', 'desc')
                ->first();
            $tierAtTime = $latestLog ? $latestLog->new_tier : 'free';
            if ($tierAtTime === $tier) {
                $count++;
            }
        }
        return $count;
    }

    /**
     * Get the accurate historical count of an artisan status at a specific point in time.
     */
    private function getHistoricalStatusCount($status, $daysAgo = 30)
    {
        $targetDate = now()->subDays($daysAgo);
        $users = User::where('role', 'artisan')->get();
        $count = 0;
        foreach ($users as $user) {
            $latestLog = ArtisanStatusLog::where('user_id', $user->id)
                ->where('created_at', '<=', $targetDate)
                ->orderBy('created_at', 'desc')
                ->first();
            $statusAtTime = $latestLog ? $latestLog->new_status : null;
            if ($statusAtTime === $status) {
                $count++;
            }
        }
        return $count;
    }
}
