<?php

namespace App\Services\Audit;

use App\Models\SellerActivityLog;
use App\Models\StaffAccessAudit;
use App\Models\User;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Collection;

class AuditLogAggregationService
{
    private const MAX_SOURCE_ENTRIES = 24;

    private FinanceBillingAuditLogger $financeLogger;

    public function __construct(FinanceBillingAuditLogger $financeLogger)
    {
        $this->financeLogger = $financeLogger;
    }

    /**
     * Retrieve all audit sources structured for the seller.
     *
     * @param User $seller
     * @param int|null $limit
     * @return array
     */
    public function getAuditSources(User $seller, ?int $limit = self::MAX_SOURCE_ENTRIES): array
    {
        return [
            'operations' => $this->operationsPayload($seller, $limit),
            'staff' => $this->staffAccessPayload($seller, $limit),
            'payroll' => $this->financeLogger->payrollPayload($seller, $limit),
            'procurement' => $this->financeLogger->procurementPayload($seller, $limit),
            'billing' => $this->financeLogger->subscriptionPayload($seller, $limit),
            'capital' => $this->financeLogger->capitalPayload($seller, $limit),
        ];
    }

    /**
     * @return array{label:string,available:bool,count:int,entries:\Illuminate\Support\Collection<int, array<string,mixed>>}
     */
    private function operationsPayload(User $seller, ?int $limit = self::MAX_SOURCE_ENTRIES): array
    {
        $available = self::tableExists('seller_activity_logs');

        if (!$available) {
            return self::emptyPayload('Operational Activity');
        }

        $query = SellerActivityLog::query()
            ->with('actor:id,name,role,seller_owner_id')
            ->where('seller_owner_id', $seller->id)
            ->latest('occurred_at');

        if ($limit) {
            $query->limit($limit);
        }

        $entries = $query->get()
            ->map(function (SellerActivityLog $entry): array {
                $details = (array) $entry->details;
                $detailLines = collect($details['lines'] ?? [])
                    ->filter(fn ($line) => filled($line))
                    ->values()
                    ->all();

                return self::entry(
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
                    actorType: $entry->actor_type ?: self::resolveActorType($entry->actor),
                    subject: $entry->subject_label,
                    amountLabel: $entry->amount_label,
                    reference: $entry->reference,
                    detailLines: $detailLines,
                    before: self::normalizeDiffBlock($details['before'] ?? null),
                    after: self::normalizeDiffBlock($details['after'] ?? null),
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
    private function staffAccessPayload(User $seller, ?int $limit = self::MAX_SOURCE_ENTRIES): array
    {
        $available = self::tableExists('staff_access_audits');

        if (!$available) {
            return self::emptyPayload('Staff Access');
        }

        $query = StaffAccessAudit::query()
            ->with([
                'actor:id,name,role,seller_owner_id',
                'staffUser:id,name,email',
                'employee:id,name,role',
            ])
            ->where('seller_owner_id', $seller->id)
            ->latest();

        if ($limit) {
            $query->limit($limit);
        }

        $entries = $query->get()
            ->map(function (StaffAccessAudit $audit): array {
                $details = (array) $audit->details;
                $changes = collect((array) data_get($details, 'changes'))
                    ->filter(fn ($change) => filled($change))
                    ->values()
                    ->all();

                return self::entry(
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
                    actorType: self::resolveActorType($audit->actor),
                    subject: $audit->employee?->name ?? $audit->staffUser?->name,
                    reference: $audit->staffUser?->email,
                    detailLines: $changes,
                    before: self::normalizeDiffBlock($details['before'] ?? null),
                    after: self::normalizeDiffBlock($details['after'] ?? null),
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
     * @param  array<int, string>  $detailLines
     * @param  array<string, mixed>|null  $before
     * @param  array<string, mixed>|null  $after
     * @return array<string, mixed>
     */
    public static function entry(
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
    public static function emptyPayload(string $label): array
    {
        return [
            'label' => $label,
            'available' => false,
            'count' => 0,
            'entries' => collect(),
        ];
    }

    public static function tableExists(string $table): bool
    {
        return \Illuminate\Support\Facades\Cache::remember("schema_table_exists_{$table}", 86400, function () use ($table) {
            return Schema::hasTable($table);
        });
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
    public static function normalizeDiffBlock(mixed $value): ?array
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

    public static function resolveActorType(?User $actor, string $fallback = 'system'): string
    {
        return SellerActivityLog::resolveActorType($actor, $fallback);
    }

    public static function planLabel(string $plan): string
    {
        return match ($plan) {
            'premium' => 'Premium',
            'super_premium' => 'Elite',
            'free' => 'Standard',
            default => ucfirst(str_replace('_', ' ', $plan)),
        };
    }

    public static function formatPeso(float $amount): string
    {
        return 'PHP ' . number_format($amount, 2);
    }
}
