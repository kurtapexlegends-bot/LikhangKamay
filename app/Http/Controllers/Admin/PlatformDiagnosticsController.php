<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Category;
use App\Models\PlatformActivity;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class PlatformDiagnosticsController extends Controller
{
    /**
     * Platform Operations Control Center Dashboard (Audit Logs)
     */
    public function operations(Request $request)
    {
        Gate::authorize('admin-action');

        return Inertia::render('Admin/Layout/PlatformOperations', [
            'activities' => $this->getActivityLogs($request),
            'filters' => $request->only(['search', 'action_type']),
            'availableActions' => $this->getAvailableActions(),
        ]);
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
