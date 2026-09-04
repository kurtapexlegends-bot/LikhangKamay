<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\Category;
use App\Models\PlatformActivity;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Symfony\Component\HttpFoundation\StreamedResponse;

class PlatformDiagnosticsController extends Controller
{
    /**
     * Platform Operations Control Center Dashboard (Activity History)
     */
    public function operations(Request $request)
    {
        Gate::authorize('admin-action');

        $admins = User::whereIn('role', ['admin', 'super_admin'])
            ->select(['id', 'name'])
            ->orderBy('name')
            ->get();

        return Inertia::render('Admin/Layout/PlatformOperations', [
            'activities' => $this->getActivityLogs($request),
            'filters' => $request->only(['search', 'action_type', 'admin_id', 'start_date', 'end_date']),
            'availableActions' => $this->getAvailableActions(),
            'admins' => $admins,
        ]);
    }

    /**
     * Export platform activity/activity history to CSV streamed response.
     */
    public function export(Request $request): StreamedResponse
    {
        Gate::authorize('admin-action');

        $search = $request->input('search');
        $actionType = $request->input('action_type');
        $adminId = $request->input('admin_id');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

        $activities = PlatformActivity::query()
            ->with('user:id,name,role')
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
            ->when($adminId, function ($query, $adminId) {
                $query->where('user_id', $adminId);
            })
            ->when($startDate, function ($query, $startDate) {
                $query->where('created_at', '>=', $startDate . ' 00:00:00');
            })
            ->when($endDate, function ($query, $endDate) {
                $query->where('created_at', '<=', $endDate . ' 23:59:59');
            })
            ->latest()
            ->get();

        $filename = 'platform_activity_log_' . date('Y-m-d_H-i-s') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        $callback = function () use ($activities) {
            $file = fopen('php://output', 'w');
            fputcsv($file, ['ID', 'Action', 'Description', 'User', 'Role', 'Metadata', 'Timestamp']);

            foreach ($activities as $a) {
                $metadataStr = $a->metadata ? json_encode($a->metadata) : '';
                fputcsv($file, [
                    $a->id,
                    $a->action,
                    $a->description,
                    $a->user->name ?? 'System',
                    $a->user->role ?? 'N/A',
                    $metadataStr,
                    $a->created_at->toIso8601String(),
                ]);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    private function getActivityLogs(Request $request)
    {
        $search = $request->input('search');
        $actionType = $request->input('action_type');
        $adminId = $request->input('admin_id');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');

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
            ->when($adminId, function ($query, $adminId) {
                $query->where('user_id', $adminId);
            })
            ->when($startDate, function ($query, $startDate) {
                $query->where('created_at', '>=', $startDate . ' 00:00:00');
            })
            ->when($endDate, function ($query, $endDate) {
                $query->where('created_at', '<=', $endDate . ' 23:59:59');
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
                    'avatar_url' => $a->user?->avatar_url,
                ]
            ]);
    }

    private function getAvailableActions(): array
    {
        return Cache::remember('platform_activity_actions', 300, function () {
            return PlatformActivity::select('action')
                ->distinct()
                ->pluck('action')
                ->all();
        });
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
