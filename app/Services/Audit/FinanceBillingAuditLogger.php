<?php

namespace App\Services\Audit;

use App\Models\Payroll;
use App\Models\StockRequest;
use App\Models\SubscriptionTransaction;
use App\Models\User;
use App\Models\CapitalAdjustment;
use Illuminate\Support\Collection;

class FinanceBillingAuditLogger
{
    private const MAX_SOURCE_ENTRIES = 24;

    /**
     * @return array{label:string,available:bool,count:int,entries:\Illuminate\Support\Collection<int, array<string,mixed>>}
     */
    public function payrollPayload(User $seller, ?int $limit = self::MAX_SOURCE_ENTRIES): array
    {
        $available = AuditLogAggregationService::tableExists('payrolls');

        if (!$available) {
            return AuditLogAggregationService::emptyPayload('Payroll Reviews');
        }

        $query = Payroll::query()
            ->with(['requester:id,name,role,seller_owner_id'])
            ->where('user_id', $seller->id)
            ->latest();

        if ($limit) {
            $query->limit($limit);
        }

        $entries = $query->get()
            ->map(function (Payroll $payroll) use ($seller): array {
                $status = strtolower((string) $payroll->status);

                return AuditLogAggregationService::entry(
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
                    actorType: AuditLogAggregationService::resolveActorType($payroll->requester, 'owner'),
                    subject: $payroll->month,
                    amountLabel: AuditLogAggregationService::formatPeso((float) $payroll->total_amount),
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
    public function procurementPayload(User $seller, ?int $limit = self::MAX_SOURCE_ENTRIES): array
    {
        $available = AuditLogAggregationService::tableExists('stock_requests');

        if (!$available) {
            return AuditLogAggregationService::emptyPayload('Procurement Reviews');
        }

        $query = StockRequest::query()
            ->with(['supply:id,name', 'requester:id,name,role,seller_owner_id'])
            ->where('user_id', $seller->id)
            ->latest();

        if ($limit) {
            $query->limit($limit);
        }

        $entries = $query->get()
            ->map(function (StockRequest $request) use ($seller): array {
                $status = strtolower((string) $request->status);
                $supplyName = $request->supply?->name ?? "Supply #{$request->supply_id}";

                return AuditLogAggregationService::entry(
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
                    actorType: AuditLogAggregationService::resolveActorType($request->requester, 'owner'),
                    subject: $supplyName,
                    amountLabel: AuditLogAggregationService::formatPeso((float) $request->total_cost),
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
    public function subscriptionPayload(User $seller, ?int $limit = self::MAX_SOURCE_ENTRIES): array
    {
        $available = AuditLogAggregationService::tableExists('subscription_transactions');

        if (!$available) {
            return AuditLogAggregationService::emptyPayload('Billing Activity');
        }

        $query = SubscriptionTransaction::query()
            ->where(function ($query) use ($seller) {
                $query->where('user_id', $seller->id)
                    ->orWhere('artisan_id', $seller->id);
            })
            ->latest();

        if ($limit) {
            $query->limit($limit);
        }

        $entries = $query->get()
            ->map(function (SubscriptionTransaction $transaction) use ($seller): array {
                $status = strtolower((string) $transaction->status);

                return AuditLogAggregationService::entry(
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
                        AuditLogAggregationService::planLabel($transaction->from_plan ?: 'free'),
                        AuditLogAggregationService::planLabel($transaction->to_plan ?: $transaction->tier_purchased ?: 'free')
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
                    amountLabel: AuditLogAggregationService::formatPeso((float) ($transaction->amount_paid ?? $transaction->amount ?? 0)),
                    reference: $transaction->reference_number,
                    detailLines: array_values(array_filter([
                        $transaction->currency ? "Currency: {$transaction->currency}" : null,
                    ])),
                    before: [
                        'plan' => AuditLogAggregationService::planLabel($transaction->from_plan ?: 'free'),
                    ],
                    after: [
                        'plan' => AuditLogAggregationService::planLabel($transaction->to_plan ?: $transaction->tier_purchased ?: 'free'),
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
     * @return array{label:string,available:bool,count:int,entries:\Illuminate\Support\Collection<int, array<string,mixed>>}
     */
    public function capitalPayload(User $seller, ?int $limit = self::MAX_SOURCE_ENTRIES): array
    {
        $available = AuditLogAggregationService::tableExists('capital_adjustments');

        if (!$available) {
            return AuditLogAggregationService::emptyPayload('Capital Adjustments');
        }

        $query = CapitalAdjustment::query()
            ->with(['adjustedBy:id,name,role'])
            ->where('user_id', $seller->id)
            ->latest();

        if ($limit) {
            $query->limit($limit);
        }

        $entries = $query->get()
            ->map(function (CapitalAdjustment $adjustment): array {
                return AuditLogAggregationService::entry(
                    id: "capital-{$adjustment->id}",
                    category: 'finance',
                    module: 'accounting',
                    eventType: 'capital_adjusted',
                    title: 'Starting Balance Adjusted',
                    summary: $adjustment->memo ?? 'Starting balance manually adjusted.',
                    status: 'completed',
                    severity: 'info',
                    occurredAt: optional($adjustment->created_at)->toIso8601String(),
                    actorName: $adjustment->adjustedBy?->name,
                    actorType: AuditLogAggregationService::resolveActorType($adjustment->adjustedBy),
                    subject: 'Base Funds',
                    amountLabel: AuditLogAggregationService::formatPeso((float) $adjustment->new_amount),
                    reference: 'Prev: ' . AuditLogAggregationService::formatPeso((float) $adjustment->previous_amount),
                    detailLines: [
                        'Previous Starting Balance: ' . AuditLogAggregationService::formatPeso((float) $adjustment->previous_amount),
                        'New Starting Balance: ' . AuditLogAggregationService::formatPeso((float) $adjustment->new_amount),
                    ],
                    before: [
                        'base funds' => AuditLogAggregationService::formatPeso((float) $adjustment->previous_amount),
                    ],
                    after: [
                        'base funds' => AuditLogAggregationService::formatPeso((float) $adjustment->new_amount),
                    ],
                    targetUrl: route('accounting.index'),
                    targetLabel: 'Open Finance',
                );
            });

        return [
            'label' => 'Capital Adjustments',
            'available' => true,
            'count' => CapitalAdjustment::query()
                ->where('user_id', $seller->id)
                ->count(),
            'entries' => $entries,
        ];
    }
}
