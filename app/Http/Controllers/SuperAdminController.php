<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;
use App\Mail\ArtisanApproved;
use App\Mail\ArtisanRejected;

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


        // Pending Artisans (use setup_completed_at)
        $pendingArtisans = $this->getMetric(User::class, [
            'role' => 'artisan',
            'artisan_status' => 'pending'
        ], 'setup_completed_at');
        
        // Approved Artisans (use approved_at)
        $approvedArtisans = $this->getMetric(User::class, [
            'role' => 'artisan',
            'artisan_status' => 'approved'
        ], 'approved_at');
        
        $rejectedArtisans = User::where('role', 'artisan')->where('artisan_status', 'rejected')->count();

        // Recent registrations
        $recentUsers = User::orderBy('created_at', 'desc')
            ->limit(10)
            ->get(['id', 'name', 'email', 'role', 'artisan_status', 'created_at', 'shop_name', 'avatar']);

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
}
