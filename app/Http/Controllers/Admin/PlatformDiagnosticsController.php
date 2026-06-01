<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Category;
use App\Models\ReviewDispute;
use App\Models\SponsorshipRequest;
use App\Models\User;
use App\Models\PlatformActivity;
use App\Services\Admin\AdminAnalyticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Inertia\Inertia;

class PlatformDiagnosticsController extends Controller
{
    protected AdminAnalyticsService $analytics;

    public function __construct(AdminAnalyticsService $analytics)
    {
        $this->analytics = $analytics;
    }

    /**
     * Platform Operations Control Center Dashboard
     */
    public function operations(Request $request)
    {
        Gate::authorize('admin-action');
        $activeTab = $request->input('tab', 'health');

        return Inertia::render('Admin/Layout/PlatformOperations', [
            'systemHealth' => $this->getSystemHealth(),
            'queueStatus' => $this->getQueueStatus(),
            'memoryUsage' => $this->getMemoryUsage(),
            'peakMemoryUsage' => $this->getPeakMemoryUsage(),
            'slaMetrics' => $this->getSLAMetrics(),
            'staleQueue' => $this->getStaleQueue(),
            'activities' => $this->getActivityLogs($request),
            'filters' => $request->only(['search', 'action_type']),
            'availableActions' => $this->getAvailableActions(),
            'defaultTab' => $activeTab,
        ]);
    }

    private function getSystemHealth(): array
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
            $paymongoStatus = Cache::remember('paymongo_api_status', 60, function () {
                $secretKey = config('services.paymongo.secret_key');
                if ($secretKey) {
                    $response = Http::withToken($secretKey)
                        ->get('https://api.paymongo.com/v1/links?limit=1');
                    return $response->successful() ? 'Online' : 'Error';
                }
                return 'Unconfigured';
            });
        } catch (\Exception $e) {
            $paymongoStatus = 'Offline';
        }

        return [
            'database' => $dbStatus,
            'cache' => $cacheStatus,
            'paymongo' => $paymongoStatus,
            'lalamove' => 'Unconfigured',
            'smtp' => config('mail.mailers.smtp.host') ? 'Configured' : 'Unconfigured',
            'environment' => config('app.env'),
            'debug_mode' => config('app.debug'),
        ];
    }

    private function getQueueStatus(): array
    {
        return [
            'total_jobs' => DB::table('jobs')->count(),
            'failed_jobs' => DB::table('failed_jobs')->count(),
            'emails' => DB::table('jobs')->where('payload', 'like', '%Mail%')->orWhere('payload', 'like', '%Notification%')->count(),
            'reports' => DB::table('jobs')->where('payload', 'like', '%Report%')->count(),
            'images' => DB::table('jobs')->where('payload', 'like', '%Image%')->orWhere('payload', 'like', '%Process%')->count(),
        ];
    }

    private function getMemoryUsage(): float
    {
        return round(memory_get_usage(true) / 1024 / 1024, 2);
    }

    private function getPeakMemoryUsage(): float
    {
        return round(memory_get_peak_usage(true) / 1024 / 1024, 2);
    }

    private function getSLAMetrics(): array
    {
        $metrics = $this->analytics->getSLAMetrics();
        $staleQueueCount = $this->getStaleQueue()->count();
        return array_merge($metrics, ['totalStaleItems' => $staleQueueCount]);
    }

    private function getStaleQueue()
    {
        $staleArtisanApplications = $this->getStaleArtisanApplications();
        $staleDisputes = $this->getStaleDisputes();
        $staleSponsorships = $this->getStaleSponsorships();
        
        return collect([])
            ->concat($staleArtisanApplications)
            ->concat($staleDisputes)
            ->concat($staleSponsorships)
            ->sortByDesc('hours_pending')
            ->values();
    }

    private function getActivityLogs(Request $request)
    {
        $search = $request->input('search');
        $actionType = $request->input('action_type');

        return PlatformActivity::query()
            ->with('user:id,name,role,avatar')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('description', 'like', "%{$search}%")
                      ->orWhere('action', 'like', "%{$search}%")
                      ->orWhereHas('user', function ($uq) use ($search) {
                          $uq->where('name', 'like', "%{$search}%");
                      });
                });
            })
            ->when($actionType, function ($query, $actionType) {
                $query->where('action', $actionType);
            })
            ->latest()
            ->paginate(50)
            ->withQueryString()
            ->through(fn($a) => [
                'id' => $a->id,
                'action' => $a->action,
                'description' => $a->description,
                'metadata' => $a->metadata,
                'created_at' => $a->created_at->toIso8601String(),
                'user' => [
                    'name' => $a->user->name ?? 'System',
                    'role' => $a->user->role ?? 'N/A',
                    'avatar' => $a->user->avatar ?? null,
                ]
            ]);
    }

    private function getAvailableActions(): array
    {
        return Cache::remember('platform_activity_actions', 3600, function () {
            return PlatformActivity::select('action')
                ->distinct()
                ->pluck('action')
                ->all();
        });
    }

    protected function getStaleArtisanApplications()
    {
        return User::where('role', 'artisan')
            ->where('artisan_status', 'pending')
            ->where('setup_completed_at', '<=', now()->subHours(48))
            ->orderBy('setup_completed_at', 'asc')
            ->limit(50)
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
    }

    protected function getStaleDisputes()
    {
        return ReviewDispute::where('status', 'under_review')
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
    }

    protected function getStaleSponsorships()
    {
        return SponsorshipRequest::where('status', 'pending')
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
    }

    /**
     * Purge all system caches
     */
    public function purgeCache()
    {
        Gate::authorize('admin-action');
        Artisan::call('cache:clear');
        Artisan::call('view:clear');
        
        PlatformActivity::create([
            'user_id' => Auth::id(),
            'action' => 'system_cache_purged',
            'description' => 'Super Admin forcefully purged the application cache.',
        ]);

        return back()->with('success', 'System cache successfully purged. Memory is clear.');
    }

    /**
     * Restore a soft-deleted item from the trash.
     */
    public function restoreItem(Request $request)
    {
        Gate::authorize('admin-action');
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

        PlatformActivity::create([
            'user_id' => Auth::id(),
            'action' => 'item_restored',
            'description' => "Super Admin restored soft-deleted {$validated['type']} (ID: {$validated['id']}).",
        ]);

        return back()->with('success', "{$validated['type']} restored successfully.");
    }

    /**
     * Permanently delete an item from the trash.
     */
    public function permanentDeleteItem(Request $request)
    {
        Gate::authorize('admin-action');
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

        PlatformActivity::create([
            'user_id' => Auth::id(),
            'action' => 'item_permanently_deleted',
            'description' => "Super Admin permanently deleted {$validated['type']} (ID: {$validated['id']}).",
        ]);

        return back()->with('success', "{$validated['type']} permanently deleted.");
    }
}
