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
    public function index(AuditLogAggregationService $auditService): Response
    {
        $seller = $this->sellerOwner();

        $sources = $auditService->getAuditSources($seller);

        $entries = collect($sources)
            ->pluck('entries')
            ->flatten(1)
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
                    'total_events' => collect($sources)->sum('count'),
                    'operations_events' => $sources['operations']['count'],
                    'staff_events' => $sources['staff']['count'],
                    'finance_events' => $sources['payroll']['count'] + $sources['procurement']['count'] + $sources['capital']['count'],
                    'billing_events' => $sources['billing']['count'],
                    'latest_event_at' => $entries[0]['occurred_at'] ?? null,
                    'coverage' => $coverage,
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
