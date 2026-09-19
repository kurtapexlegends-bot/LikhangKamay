<?php

declare(strict_types=1);

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Admin\AdminAnalyticsService;
use App\Services\Admin\SuperAdminService;
use App\Services\Compliance\UserDisciplinaryService;
use App\Actions\Admin\Users\ApproveArtisan;
use App\Actions\Admin\Users\RejectArtisan;
use App\Actions\Admin\Users\BulkApproveArtisans;
use App\Http\Requests\Admin\BulkApproveArtisansRequest;
use App\Http\Requests\Admin\DisciplineUserRequest;
use App\Http\Requests\Admin\MarkArtisanDocumentViewedRequest;
use App\Http\Requests\Admin\RejectArtisanRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class SuperAdminController extends Controller
{
    public function __construct(
        protected AdminAnalyticsService $analytics,
        protected SuperAdminService $superAdminService
    ) {}

    /**
     * Admin Dashboard - Platform overview.
     */
    public function dashboard(): Response
    {
        Gate::authorize('admin-action');

        try {
            return Inertia::render('Admin/Layout/Dashboard', $this->superAdminService->getDashboardData());
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
                'db_error' => true,
            ]);
        }
    }

    /**
     * User Directory & Approvals Center.
     */
    public function userManager(Request $request): Response
    {
        Gate::authorize('admin-action');

        try {
            return Inertia::render('Admin/Users/UserManager', $this->superAdminService->getUserManagerData($request));
        } catch (\Throwable $e) {
            Log::error("SuperAdmin UserManager error: " . $e->getMessage(), [
                'exception' => $e,
            ]);

            return Inertia::render('Admin/Users/UserManager', [
                'users' => [
                    'data' => [],
                    'total' => 0,
                    'per_page' => 10,
                    'current_page' => 1,
                    'last_page' => 1,
                    'links' => [],
                ],
                'filters' => [
                    'role' => $request->get('role', 'all'),
                    'search' => trim((string) $request->get('search', '')),
                    'tab' => $request->get('tab', 'directory'),
                    'status' => $request->get('status', 'all'),
                    'verification' => $request->get('verification', 'all'),
                    'start_date' => $request->get('start_date'),
                    'end_date' => $request->get('end_date'),
                ],
                'unlinkedStaffGroup' => [
                    'staff_members' => [],
                    'staff_count' => 0,
                ],
                'artisans' => [],
                'load_error' => 'Unable to load accounts at this moment: ' . $e->getMessage(),
            ]);
        }
    }

    public function markArtisanDocumentViewed(MarkArtisanDocumentViewedRequest $request, int|string $id)
    {
        $documentKey = (string) $request->validated('document');
        $viewed = $this->superAdminService->markArtisanDocumentViewed($id, $documentKey);

        return response()->json([
            'success' => true,
            'viewed' => $viewed,
            'viewed_document_keys' => $viewed,
        ]);
    }

    public function approveArtisan(int|string $id, ApproveArtisan $approveArtisan)
    {
        Gate::authorize('admin-action');

        $approveArtisan->execute($id, Auth::id());

        return back()->with('success', 'Artisan approved successfully!');
    }

    public function rejectArtisan(RejectArtisanRequest $request, int|string $id, RejectArtisan $rejectArtisan)
    {
        $rejectArtisan->execute($id, strip_tags((string) $request->validated('reason')));

        return back()->with('success', 'Artisan application returned for revision.');
    }

    /**
     * Insights & Analytics.
     */
    public function insights(): Response
    {
        Gate::authorize('admin-action');

        return Inertia::render('Admin/Analytics/Insights', $this->analytics->getInsightsData());
    }

    public function reengageArtisan(Request $request, User $user)
    {
        Gate::authorize('admin-action');

        if (!$user->isArtisan()) {
            return response()->json([
                'success' => false,
                'message' => 'Target user is not an artisan.',
            ], 422);
        }

        $this->superAdminService->reengageArtisan($user);

        return response()->json([
            'success' => true,
            'message' => "Re-engagement email & in-app alert sent to {$user->name}.",
        ]);
    }

    public function exportInsights(): StreamedResponse
    {
        Gate::authorize('admin-action');

        return $this->superAdminService->exportInsightsReport();
    }

    public function viewArtisan(int|string $id): Response
    {
        Gate::authorize('admin-action');

        return Inertia::render('Admin/ArtisanDetail', [
            'artisan' => $this->superAdminService->getArtisanDetail($id),
        ]);
    }

    public function bulkApproveArtisans(BulkApproveArtisansRequest $request, BulkApproveArtisans $bulkApproveArtisans)
    {
        $ids = (array) $request->validated('ids');
        $count = $bulkApproveArtisans->execute($ids, Auth::id());

        return back()->with('success', "Successfully approved {$count} artisans.");
    }

    public function disciplineUser(
        DisciplineUserRequest $request,
        User $user,
        UserDisciplinaryService $disciplinaryService
    ) {
        if ($user->isAdmin()) {
            return back()->withErrors(['error' => 'You cannot modify an administrator account status.']);
        }

        $validated = $request->validated();
        $admin = Auth::user();
        assert($admin instanceof User);

        match ($validated['action']) {
            'warning' => $disciplinaryService->issueWarning($admin, $user, $validated['reason']),
            'suspension' => $disciplinaryService->applySuspension($admin, $user, (int) $validated['duration_days'], $validated['reason']),
            'ban' => $disciplinaryService->applyBan($admin, $user, $validated['reason']),
            'lift_suspension' => $disciplinaryService->liftSuspension($admin, $user, $validated['reason']),
            'unban' => $disciplinaryService->liftBan($admin, $user, $validated['reason']),
        };

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

        $actionLabel = match ($validated['action']) {
            'warning' => 'Formal warning issued successfully.',
            'suspension' => "User suspended for {$validated['duration_days']} days.",
            'ban' => 'Account permanently deactivated.',
            'lift_suspension' => 'Suspension lifted successfully.',
            'unban' => 'Account access reinstated successfully.',
            default => 'Disciplinary action executed.',
        };

        return back()->with('success', $actionLabel);
    }

    public function toggleUserStatus(Request $request, User $user)
    {
        Gate::authorize('admin-action');

        if ($user->isAdmin()) {
            return back()->withErrors(['error' => 'You cannot suspend or deactivate an administrator account.']);
        }

        $this->superAdminService->toggleUserStatus($user, (int) Auth::id());

        return back()->with('success', 'User status updated successfully.');
    }

    public function checkArtisanSlug(Request $request)
    {
        Gate::authorize('admin-action');

        $exists = $this->superAdminService->checkArtisanSlug(
            (string) $request->input('slug'),
            $request->input('exclude_id')
        );

        return response()->json(['exists' => $exists]);
    }
}
