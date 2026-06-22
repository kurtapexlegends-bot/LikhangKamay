<?php

namespace App\Actions\Seller\Audit;

use App\Models\User;
use App\Services\Audit\AuditLogAggregationService;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ExportAuditLogCsv
{
    /**
     * Execute CSV audit log report export.
     *
     * @param User $seller
     * @param AuditLogAggregationService $auditService
     * @param array $filters
     * @return StreamedResponse
     */
    public function execute(
        User $seller,
        AuditLogAggregationService $auditService,
        array $filters = []
    ): StreamedResponse {
        $filename = 'audit_log_' . date('Y-m-d_H-i-s') . '.csv';

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
            'Pragma' => 'no-cache',
            'Cache-Control' => 'must-revalidate, post-check=0, pre-check=0',
            'Expires' => '0',
        ];

        // Fetch up to 500 entries per source to compile a large history
        $sources = $auditService->getAuditSources($seller, 500);

        $entries = collect($sources)
            ->pluck('entries')
            ->flatten(1)
            ->sortByDesc('sort_at')
            ->values();

        // Apply filters
        $category = $filters['category'] ?? 'all';
        if ($category && $category !== 'all') {
            $entries = $entries->filter(fn($e) => ($e['category'] ?? '') === $category);
        }

        $module = $filters['module'] ?? 'all';
        if ($module && $module !== 'all') {
            $entries = $entries->filter(fn($e) => ($e['module'] ?? '') === $module);
        }

        $status = $filters['status'] ?? 'all';
        if ($status && $status !== 'all') {
            $entries = $entries->filter(fn($e) => ($e['status'] ?? '') === $status);
        }

        $severity = $filters['severity'] ?? 'all';
        if ($severity && $severity !== 'all') {
            $entries = $entries->filter(fn($e) => ($e['severity'] ?? '') === $severity);
        }

        $actorType = $filters['actor_type'] ?? 'all';
        if ($actorType && $actorType !== 'all') {
            $entries = $entries->filter(fn($e) => ($e['actor_type'] ?? '') === $actorType);
        }

        $startDate = $filters['start_date'] ?? null;
        if ($startDate) {
            $startTimestamp = strtotime($startDate . ' 00:00:00');
            $entries = $entries->filter(fn($e) => ($e['sort_at'] ?? 0) >= $startTimestamp);
        }

        $endDate = $filters['end_date'] ?? null;
        if ($endDate) {
            $endTimestamp = strtotime($endDate . ' 23:59:59');
            $entries = $entries->filter(fn($e) => ($e['sort_at'] ?? 0) <= $endTimestamp);
        }

        $search = $filters['search'] ?? null;
        if ($search) {
            $search = strtolower($search);
            $entries = $entries->filter(function($e) use ($search) {
                $searchHaystack = [
                    $e['title'] ?? '',
                    $e['summary'] ?? '',
                    $e['subject'] ?? '',
                    $e['reference'] ?? '',
                    $e['actor_name'] ?? '',
                    $e['actor_type'] ?? '',
                    $e['module'] ?? '',
                    $e['event_type'] ?? '',
                ];
                if (isset($e['detail_lines']) && is_array($e['detail_lines'])) {
                    $searchHaystack = array_merge($searchHaystack, $e['detail_lines']);
                }
                if (isset($e['before']) && is_array($e['before'])) {
                    foreach ($e['before'] as $k => $v) {
                        $searchHaystack[] = "$k $v";
                    }
                }
                if (isset($e['after']) && is_array($e['after'])) {
                    foreach ($e['after'] as $k => $v) {
                        $searchHaystack[] = "$k $v";
                    }
                }
                $haystackStr = strtolower(implode(' ', array_filter($searchHaystack)));
                return str_contains($haystackStr, $search);
            });
        }

        $callback = function () use ($entries) {
            $file = fopen('php://output', 'w');

            // Write CSV headers
            fputcsv($file, [
                'Occurred At',
                'Category',
                'Module',
                'Event Type',
                'Severity',
                'Status',
                'Title',
                'Summary',
                'Actor',
                'Actor Type',
                'Subject',
                'Reference',
                'Amount',
                'Details',
            ]);

            foreach ($entries as $entry) {
                $details = [];
                if (isset($entry['detail_lines']) && is_array($entry['detail_lines'])) {
                    $details = array_merge($details, $entry['detail_lines']);
                }
                if (isset($entry['before']) && is_array($entry['before'])) {
                    foreach ($entry['before'] as $k => $v) {
                        $details[] = "Before $k: $v";
                    }
                }
                if (isset($entry['after']) && is_array($entry['after'])) {
                    foreach ($entry['after'] as $k => $v) {
                        $details[] = "After $k: $v";
                    }
                }

                fputcsv($file, [
                    $entry['occurred_at'] ?? '',
                    $entry['category'] ?? '',
                    $entry['module'] ?? '',
                    $entry['event_type'] ?? '',
                    $entry['severity'] ?? '',
                    $entry['status'] ?? '',
                    $entry['title'] ?? '',
                    $entry['summary'] ?? '',
                    $entry['actor_name'] ?? '',
                    $entry['actor_type'] ?? '',
                    $entry['subject'] ?? '',
                    $entry['reference'] ?? '',
                    $entry['amount_label'] ?? '',
                    implode(' | ', $details),
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }
}
