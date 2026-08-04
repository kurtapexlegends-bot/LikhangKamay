<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Services\Audit\AuditLogAggregationService;
use App\Actions\Seller\Audit\ExportAuditLogCsv;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditLogController extends Controller
{
    use InteractsWithSellerContext;

    /**
     * Display the aggregated audit log dashboard.
     *
     * @param AuditLogAggregationService $auditService
     * @return Response
     */
    public function index(Request $request, AuditLogAggregationService $auditService): Response
    {
        $user = $request->user();
        $seller = $this->sellerOwner();
        $isStaff = $user->id !== $seller->id;

        $sources = $auditService->getAuditSources($seller);

        $entries = collect($sources)
            ->pluck('entries')
            ->flatten(1)
            ->when($isStaff, function ($collection) use ($user) {
                return $collection->filter(function (array $entry) use ($user) {
                    return (isset($entry['actor_id']) && (int)$entry['actor_id'] === (int)$user->id)
                        || (isset($entry['actor_user_id']) && (int)$entry['actor_user_id'] === (int)$user->id)
                        || (isset($entry['user_id']) && (int)$entry['user_id'] === (int)$user->id);
                });
            })
            ->sortByDesc('sort_at')
            ->take(120)
            ->values()
            ->map(fn (array $entry) => collect($entry)->except('sort_at')->all())
            ->all();

        $coverage = collect($sources)->map(function (array $source, string $key) {
            return [
                'key' => $key,
                'label' => $source['label'],
                'available' => $source['available'],
                'count' => $source['count'],
                'note' => $source['available']
                    ? null
                    : 'This source is not fully tracked in the current database state.',
            ];
        })->values()->all();

        return Inertia::render('Seller/Profile/AuditLog', [
            'auditLog' => [
                'summary' => [
                    'total_events' => count($entries),
                    'operations_events' => $sources['operations']['count'],
                    'staff_events' => $sources['staff']['count'],
                    'finance_events' => $sources['payroll']['count'] + $sources['procurement']['count'] + $sources['capital']['count'],
                    'billing_events' => $sources['billing']['count'],
                    'latest_event_at' => $entries[0]['occurred_at'] ?? null,
                    'coverage' => $coverage,
                    'is_staff_view' => $isStaff,
                    'missing_sources' => collect($coverage)
                        ->filter(fn (array $source) => !$source['available'])
                        ->pluck('label')
                        ->values()
                        ->all(),
                ],
                'entries' => $entries,
            ],
        ]);
    }

    /**
     * Get JSON array of audit entries for the ActivityHistoryDrawer.
     */
    public function apiData(Request $request, AuditLogAggregationService $auditService)
    {
        $user = $request->user();
        if ($user && $user->role === 'super_admin') {
            $activities = \App\Models\PlatformActivity::with('user:id,name,email')
                ->latest()
                ->take(100)
                ->get()
                ->map(function ($activity) {
                    return [
                        'id' => $activity->id,
                        'title' => str_replace('_', ' ', ucwords(strtolower($activity->action))),
                        'description' => $activity->details,
                        'category' => 'System',
                        'module' => 'Platform Ops',
                        'severity' => 'info',
                        'status' => 'success',
                        'actor' => $activity->user?->name ?? 'System Admin',
                        'actor_type' => 'Super Admin',
                        'occurred_at' => $activity->created_at?->diffForHumans() ?? 'Just now',
                        'timestamp' => $activity->created_at?->toIso8601String(),
                        'ip_address' => $activity->ip_address ?? '127.0.0.1',
                    ];
                });

            return response()->json(['entries' => $activities]);
        }

        $seller = $this->sellerOwner();
        $sources = $auditService->getAuditSources($seller);

        $entries = collect($sources)
            ->pluck('entries')
            ->flatten(1)
            ->sortByDesc('sort_at')
            ->take(100)
            ->values()
            ->map(fn (array $entry) => collect($entry)->except('sort_at')->all())
            ->all();

        return response()->json(['entries' => $entries]);
    }

    /**
     * Export the filtered audit logs to a CSV streamed response.
     *
     * @param Request $request
     * @param AuditLogAggregationService $auditService
     * @param ExportAuditLogCsv $exporter
     * @return StreamedResponse
     */
    public function export(Request $request, AuditLogAggregationService $auditService, ExportAuditLogCsv $exporter): StreamedResponse
    {
        $seller = $this->sellerOwner();

        return $exporter->execute($seller, $auditService, $request->only([
            'category',
            'module',
            'status',
            'severity',
            'actor_type',
            'start_date',
            'end_date',
            'search',
        ]));
    }
}
