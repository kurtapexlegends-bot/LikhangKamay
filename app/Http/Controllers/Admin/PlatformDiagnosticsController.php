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
     * System Health & Diagnostics
     */
    public function index()
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

        return Inertia::render('Admin/Layout/Diagnostics', [
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

    /**
     * SLA Monitoring - Platform Governance
     */
    public function sla()
    {
        $metrics = $this->analytics->getSLAMetrics();

        $staleArtisanApplications = $this->getStaleArtisanApplications();
        $staleDisputes = $this->getStaleDisputes();
        $staleSponsorships = $this->getStaleSponsorships();

        $staleQueue = collect([])
            ->concat($staleArtisanApplications)
            ->concat($staleDisputes)
            ->concat($staleSponsorships)
            ->sortByDesc('hours_pending')
            ->values();

        return Inertia::render('Admin/Analytics/SLA', [
            'metrics' => array_merge($metrics, ['totalStaleItems' => $staleQueue->count()]),
            'staleQueue' => $staleQueue,
        ]);
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
     * Restoration Center (Trash)
     */
    public function trash()
    {
        $deletedProducts = $this->getDeletedProducts();
        $deletedCategories = $this->getDeletedCategories();
        $deletedOrders = $this->getDeletedOrders();

        $trashQueue = collect([])
            ->concat($deletedProducts)
            ->concat($deletedCategories)
            ->concat($deletedOrders)
            ->sortByDesc('deleted_at')
            ->values();

        return Inertia::render('Admin/Compliance/Trash', [
            'trashQueue' => $trashQueue,
            'stats' => [
                'totalItems' => $trashQueue->count(),
                'products' => count($deletedProducts),
                'categories' => count($deletedCategories),
                'orders' => count($deletedOrders),
            ]
        ]);
    }

    protected function getDeletedProducts()
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
                'context' => $p->user->shop_name ?? $p->user->name,
                'deleted_at' => $p->deleted_at->toIso8601String(),
                'expires_at' => $p->deleted_at->addDays(30)->toIso8601String(),
            ]);
    }

    protected function getDeletedCategories()
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

    protected function getDeletedOrders()
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
                'context' => $o->user->name ?? 'Unknown Customer',
                'deleted_at' => $o->deleted_at->toIso8601String(),
                'expires_at' => $o->deleted_at->addDays(30)->toIso8601String(),
            ]);
    }

    /**
     * Purge all system caches
     */
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

    /**
     * Platform-wide Administrative Audit Log
     */
    public function activity(Request $request)
    {
        $search = $request->input('search');
        $actionType = $request->input('action_type');

        $activities = PlatformActivity::query()
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

        // Get unique actions for the filter dropdown
        $availableActions = Cache::remember('platform_activity_actions', 3600, function () {
            return PlatformActivity::select('action')
                ->distinct()
                ->pluck('action')
                ->all();
        });

        return Inertia::render('Admin/Layout/ActivityLog', [
            'activities' => $activities,
            'filters' => $request->only(['search', 'action_type']),
            'availableActions' => $availableActions,
        ]);
    }
}
