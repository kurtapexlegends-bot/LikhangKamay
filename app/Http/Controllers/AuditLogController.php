<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Payroll;
use App\Models\SellerActivityLog;
use App\Models\StaffAccessAudit;
use App\Models\StockRequest;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    use InteractsWithSellerContext;

    private const MAX_SOURCE_ENTRIES = 24;

    public function index(): Response
    {
        $seller = $this->sellerOwner();

        $sources = [
            'operations' => $this->operationsPayload($seller),
            'staff' => $this->staffAccessPayload($seller),
            'payroll' => $this->payrollPayload($seller),
            'procurement' => $this->procurementPayload($seller),
            'billing' => $this->subscriptionPayload($seller),
        ];

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

        return Inertia::render('Seller/AuditLog', [
            'auditLog' => [
                'summary' => [
                    'total_events' => collect($sources)->sum('count'),
                    'operations_events' => $sources['operations']['count'],
                    'staff_events' => $sources['staff']['count'],
                    'finance_events' => $sources['payroll']['count'] + $sources['procurement']['count'],
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
     * @return array{label:string,available:bool,count:int,entries:\Illuminate\Support\Collection<int, array<string,mixed>>}
     */
    private function operationsPayload(User $seller): array
    {
        $available = $this->tableExists('seller_activity_logs');

        if (!$available) {
            return $this->emptyPayload('Operational Activity');
        }

        $entries = SellerActivityLog::query()
            ->with('actor:id,name,role,seller_owner_id')
            ->where('seller_owner_id', $seller->id)
            ->latest('occurred_at')
            ->limit(self::MAX_SOURCE_ENTRIES)
            ->get()
            ->map(function (SellerActivityLog $entry): array {
                $details = (array) $entry->details;
                $detailLines = collect($details['lines'] ?? [])
                    ->filter(fn ($line) => filled($line))
                    ->values()
                    ->all();

                return $this->entry(
                    id: "operations-{$entry->id}",
                    category: 'operations',
                    module: $entry->module,
                    eventType: $entry->event_type,
                    title: $entry->title,
                    summary: $entry->summary,
                    status: $entry->status ?: 'logged',
                    severity: $entry->severity ?: 'info',
                    occurredAt: optional($entry->occurred_at)->toIso8601String(),
                    actorName: $entry->actor?->name,
                    actorType: $entry->actor_type ?: $this->resolveActorType($entry->actor),
                    subject: $entry->subject_label,
                    amountLabel: $entry->amount_label,
                    reference: $entry->reference,
                    detailLines: $detailLines,
                    before: $this->normalizeDiffBlock($details['before'] ?? null),
                    after: $this->normalizeDiffBlock($details['after'] ?? null),
                    targetUrl: $entry->target_url,
                    targetLabel: $entry->target_label ?: 'Open Record',
                );
            });

        return [
            'label' => 'Operational Activity',
            'available' => true,
            'count' => SellerActivityLog::query()
                ->where('seller_owner_id', $seller->id)
                ->count(),
            'entries' => $entries,
        ];
    }

    /**
     * @return array{label:string,available:bool,count:int,entries:\Illuminate\Support\Collection<int, array<string,mixed>>}
     */
    private function staffAccessPayload(User $seller): array
    {
        $available = $this->tableExists('staff_access_audits');

        if (!$available) {
            return $this->emptyPayload('Staff Access');
        }

        $entries = StaffAccessAudit::query()
            ->with([
                'actor:id,name,role,seller_owner_id',
                'staffUser:id,name,email',
                'employee:id,name,role',
            ])
            ->where('seller_owner_id', $seller->id)
            ->latest()
            ->limit(self::MAX_SOURCE_ENTRIES)
            ->get()
            ->map(function (StaffAccessAudit $audit): array {
                $details = (array) $audit->details;
                $changes = collect((array) data_get($details, 'changes'))
                    ->filter(fn ($change) => filled($change))
                    ->values()
                    ->all();

                return $this->entry(
                    id: "staff-access-{$audit->id}",
                    category: 'staff',
                    module: 'hr',
                    eventType: $audit->event,
                    title: $this->staffAccessTitle($audit->event),
                    summary: $audit->summary,
                    status: 'completed',
                    severity: str_contains($audit->event, 'removed') || str_contains($audit->event, 'suspended') ? 'warning' : 'info',
                    occurredAt: optional($audit->created_at)->toIso8601String(),
                    actorName: $audit->actor?->name,
                    actorType: $this->resolveActorType($audit->actor),
                    subject: $audit->employee?->name ?? $audit->staffUser?->name,
                    reference: $audit->staffUser?->email,
                    detailLines: $changes,
                    before: $this->normalizeDiffBlock($details['before'] ?? null),
                    after: $this->normalizeDiffBlock($details['after'] ?? null),
                    targetUrl: route('hr.index', ['highlight_staff' => $audit->staff_user_id]),
                    targetLabel: 'Open HR',
                );
            });

        return [
            'label' => 'Staff Access',
            'available' => true,
            'count' => StaffAccessAudit::query()
                ->where('seller_owner_id', $seller->id)
                ->count(),
            'entries' => $entries,
        ];
    }

    /**
     * @return array{label:string,available:bool,count:int,entries:\Illuminate\Support\Collection<int, array<string,mixed>>}
     */
    private function payrollPayload(User $seller): array
    {
        $available = $this->tableExists('payrolls');

        if (!$available) {
            return $this->emptyPayload('Payroll Reviews');
        }

        $entries = Payroll::query()
            ->with(['requester:id,name,role,seller_owner_id'])
            ->where('user_id', $seller->id)
            ->latest()
            ->limit(self::MAX_SOURCE_ENTRIES)
            ->get()
            ->map(function (Payroll $payroll) use ($seller): array {
                $status = strtolower((string) $payroll->status);

                return $this->entry(
                    id: "payroll-{$payroll->id}",
                    category: 'finance',
                    module: 'accounting',
                    eventType: 'payroll_' . ($status ?: 'updated'),
                    title: match ($status) {
                        'paid' => 'Payroll Approved',
                        'rejected' => 'Payroll Rejected',
                        default => 'Payroll Submitted for Review',
                    },
                    summary: match ($status) {
                        'paid' => "Payroll for {$payroll->month} was approved and released.",
                        'rejected' => "Payroll for {$payroll->month} was rejected during accounting review.",
                        default => "Payroll for {$payroll->month} is waiting for accounting approval.",
                    },
                    status: $status,
                    severity: match ($status) {
                        'rejected' => 'danger',
                        'pending' => 'warning',
                        default => 'success',
                    },
                    occurredAt: optional($status === 'pending' ? $payroll->created_at : $payroll->updated_at)->toIso8601String(),
                    actorName: $payroll->requester?->name ?? $seller->name,
                    actorType: $this->resolveActorType($payroll->requester, 'owner'),
                    subject: $payroll->month,
                    amountLabel: $this->formatPeso((float) $payroll->total_amount),
                    reference: $payroll->employee_count ? "{$payroll->employee_count} employee(s)" : null,
                    detailLines: array_values(array_filter([
                        $payroll->rejection_reason ? "Reason: {$payroll->rejection_reason}" : null,
                    ])),
                    before: null,
                    after: [
                        'status' => ucfirst($status),
                    ],
                    targetUrl: route('hr.payroll.show', ['payroll' => $payroll->id]),
                    targetLabel: 'Open Payroll Run',
                );
            });

        return [
            'label' => 'Payroll Reviews',
            'available' => true,
            'count' => Payroll::query()
                ->where('user_id', $seller->id)
                ->count(),
            'entries' => $entries,
        ];
    }

    /**
     * @return array{label:string,available:bool,count:int,entries:\Illuminate\Support\Collection<int, array<string,mixed>>}
     */
    private function procurementPayload(User $seller): array
    {
        $available = $this->tableExists('stock_requests');

        if (!$available) {
            return $this->emptyPayload('Procurement Reviews');
        }

        $entries = StockRequest::query()
            ->with(['supply:id,name', 'requester:id,name,role,seller_owner_id'])
            ->where('user_id', $seller->id)
            ->latest()
            ->limit(self::MAX_SOURCE_ENTRIES)
            ->get()
            ->map(function (StockRequest $request) use ($seller): array {
                $status = strtolower((string) $request->status);
                $supplyName = $request->supply?->name ?? "Supply #{$request->supply_id}";

                return $this->entry(
                    id: "procurement-{$request->id}",
                    category: 'finance',
                    module: 'stock_requests',
                    eventType: 'procurement_' . ($status ?: 'updated'),
                    title: match ($status) {
                        StockRequest::STATUS_REJECTED => 'Procurement Request Rejected',
                        StockRequest::STATUS_PENDING => 'Procurement Request Submitted',
                        StockRequest::STATUS_ACCOUNTING_APPROVED => 'Procurement Funds Released',
                        StockRequest::STATUS_ORDERED => 'Procurement Marked Ordered',
                        StockRequest::STATUS_RECEIVED, StockRequest::STATUS_COMPLETED => 'Procurement Received',
                        default => 'Procurement Request Updated',
                    },
                    summary: match ($status) {
                        StockRequest::STATUS_REJECTED => "{$supplyName} request was rejected.",
                        StockRequest::STATUS_PENDING => "{$supplyName} request is waiting for accounting review.",
                        StockRequest::STATUS_ACCOUNTING_APPROVED => "{$supplyName} request was approved for procurement.",
                        StockRequest::STATUS_ORDERED => "{$supplyName} request was marked as ordered.",
                        StockRequest::STATUS_RECEIVED, StockRequest::STATUS_COMPLETED => "{$supplyName} request was received and processed.",
                        default => "{$supplyName} request moved to {$status}.",
                    },
                    status: $status,
                    severity: match ($status) {
                        StockRequest::STATUS_REJECTED => 'danger',
                        StockRequest::STATUS_PENDING => 'warning',
                        default => 'success',
                    },
                    occurredAt: optional($status === StockRequest::STATUS_PENDING ? $request->created_at : $request->updated_at)->toIso8601String(),
                    actorName: $request->requester?->name ?? $seller->name,
                    actorType: $this->resolveActorType($request->requester, 'owner'),
                    subject: $supplyName,
                    amountLabel: $this->formatPeso((float) $request->total_cost),
                    reference: $request->quantity ? "{$request->quantity} unit(s)" : null,
                    detailLines: array_values(array_filter([
                        $request->rejection_reason ? "Reason: {$request->rejection_reason}" : null,
                    ])),
                    before: null,
                    after: [
                        'status' => str_replace('_', ' ', ucfirst($status)),
                    ],
                    targetUrl: route('stock-requests.index', ['highlight_request' => $request->id]),
                    targetLabel: 'Open Restock Requests',
                );
            });

        return [
            'label' => 'Procurement Reviews',
            'available' => true,
            'count' => StockRequest::query()
                ->where('user_id', $seller->id)
                ->count(),
            'entries' => $entries,
        ];
    }

    /**
     * @return array{label:string,available:bool,count:int,entries:\Illuminate\Support\Collection<int, array<string,mixed>>}
     */
    private function subscriptionPayload(User $seller): array
    {
        $available = $this->tableExists('subscription_transactions');

        if (!$available) {
            return $this->emptyPayload('Billing Activity');
        }

        $entries = SubscriptionTransaction::query()
            ->where(function ($query) use ($seller) {
                $query->where('user_id', $seller->id)
                    ->orWhere('artisan_id', $seller->id);
            })
            ->latest()
            ->limit(self::MAX_SOURCE_ENTRIES)
            ->get()
            ->map(function (SubscriptionTransaction $transaction) use ($seller): array {
                $status = strtolower((string) $transaction->status);

                return $this->entry(
                    id: "subscription-{$transaction->id}",
                    category: 'billing',
                    module: 'subscription',
                    eventType: 'subscription_' . ($status ?: 'updated'),
                    title: match ($status) {
                        SubscriptionTransaction::STATUS_PAID => 'Subscription Upgrade Paid',
                        SubscriptionTransaction::STATUS_CANCELLED => 'Subscription Checkout Cancelled',
                        SubscriptionTransaction::STATUS_FAILED => 'Subscription Checkout Failed',
                        default => 'Subscription Checkout Started',
                    },
                    summary: trim(sprintf(
                        '%s to %s plan.',
                        $this->planLabel($transaction->from_plan ?: 'free'),
                        $this->planLabel($transaction->to_plan ?: $transaction->tier_purchased ?: 'free')
                    )),
                    status: $status,
                    severity: match ($status) {
                        SubscriptionTransaction::STATUS_FAILED => 'danger',
                        SubscriptionTransaction::STATUS_CANCELLED => 'warning',
                        SubscriptionTransaction::STATUS_PENDING => 'warning',
                        default => 'success',
                    },
                    occurredAt: optional($transaction->paid_at ?? $transaction->cancelled_at ?? $transaction->updated_at ?? $transaction->created_at)?->toIso8601String(),
                    actorName: $seller->shop_name ?: $seller->name,
                    actorType: 'owner',
                    amountLabel: $this->formatPeso((float) ($transaction->amount_paid ?? $transaction->amount ?? 0)),
                    reference: $transaction->reference_number,
                    detailLines: array_values(array_filter([
                        $transaction->currency ? "Currency: {$transaction->currency}" : null,
                    ])),
                    before: [
                        'plan' => $this->planLabel($transaction->from_plan ?: 'free'),
                    ],
                    after: [
                        'plan' => $this->planLabel($transaction->to_plan ?: $transaction->tier_purchased ?: 'free'),
                    ],
                    targetUrl: route('seller.subscription'),
                    targetLabel: 'Open Subscription',
                );
            });

        return [
            'label' => 'Billing Activity',
            'available' => true,
            'count' => SubscriptionTransaction::query()
                ->where(function ($query) use ($seller) {
                    $query->where('user_id', $seller->id)
                        ->orWhere('artisan_id', $seller->id);
                })
                ->count(),
            'entries' => $entries,
        ];
    }

    /**
     * @param  array<int, string>  $detailLines
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     * @return array<string, mixed>
     */
    private function entry(
        string $id,
        string $category,
        string $module,
        string $eventType,
        string $title,
        string $summary,
        string $status,
        string $severity,
        ?string $occurredAt,
        ?string $actorName = null,
        ?string $actorType = null,
        ?string $subject = null,
        ?string $amountLabel = null,
        ?string $reference = null,
        array $detailLines = [],
        ?array $before = null,
        ?array $after = null,
        ?string $targetUrl = null,
        ?string $targetLabel = null,
    ): array {
        return [
            'id' => $id,
            'category' => $category,
            'module' => $module,
            'event_type' => $eventType,
            'title' => $title,
            'summary' => $summary,
            'status' => $status,
            'severity' => $severity,
            'occurred_at' => $occurredAt,
            'actor_name' => $actorName,
            'actor_type' => $actorType,
            'subject' => $subject,
            'amount_label' => $amountLabel,
            'reference' => $reference,
            'detail_lines' => array_values(array_filter($detailLines)),
            'before' => $before,
            'after' => $after,
            'target_url' => $targetUrl,
            'target_label' => $targetLabel,
            'sort_at' => $occurredAt ? strtotime($occurredAt) : 0,
        ];
    }

    /**
     * @return array{label:string,available:bool,count:int,entries:\Illuminate\Support\Collection<int, array<string,mixed>>}
     */
    private function emptyPayload(string $label): array
    {
        return [
            'label' => $label,
            'available' => false,
            'count' => 0,
            'entries' => collect(),
        ];
    }

    private function tableExists(string $table): bool
    {
        return Schema::hasTable($table);
    }

    private function staffAccessTitle(string $event): string
    {
        return match ($event) {
            'login_created' => 'Staff Login Created',
            'login_suspended' => 'Staff Login Suspended',
            'login_restored' => 'Staff Login Restored',
            'login_removed' => 'Staff Login Removed',
            default => 'Staff Access Updated',
        };
    }

    /**
     * @param  mixed  $value
     * @return array<string, string>|null
     */
    private function normalizeDiffBlock(mixed $value): ?array
    {
        if (!is_array($value) || $value === []) {
            return null;
        }

        return collect($value)
            ->mapWithKeys(fn ($entry, $key) => [
                str_replace('_', ' ', (string) $key) => is_scalar($entry) || $entry === null
                    ? (string) ($entry ?? 'none')
                    : json_encode($entry),
            ])
            ->all();
    }

    private function resolveActorType(?User $actor, string $fallback = 'system'): string
    {
        return SellerActivityLog::resolveActorType($actor, $fallback);
    }

    private function planLabel(string $plan): string
    {
        return match ($plan) {
            'premium' => 'Premium',
            'super_premium' => 'Elite',
            'free' => 'Standard',
            default => ucfirst(str_replace('_', ' ', $plan)),
        };
    }

    private function formatPeso(float $amount): string
    {
        return 'PHP ' . number_format($amount, 2);
    }
}
