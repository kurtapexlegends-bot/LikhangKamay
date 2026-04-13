<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Payroll;
use App\Models\SellerWalletWithdrawalRequest;
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

    public function index(): Response
    {
        $seller = $this->sellerOwner();

        $entries = collect()
            ->merge($this->staffAccessEntries($seller))
            ->merge($this->withdrawalEntries($seller))
            ->merge($this->payrollEntries($seller))
            ->merge($this->procurementEntries($seller))
            ->merge($this->subscriptionEntries($seller))
            ->sortByDesc('sort_at')
            ->take(40)
            ->values()
            ->map(fn (array $entry) => collect($entry)->except('sort_at')->all())
            ->all();

        $latestEntry = $entries[0]['occurred_at'] ?? null;

        return Inertia::render('Seller/AuditLog', [
            'auditLog' => [
                'summary' => [
                    'total_events' => $this->staffAccessEventCount($seller)
                        + $this->withdrawalEventCount($seller)
                        + $this->payrollEventCount($seller)
                        + $this->procurementEventCount($seller)
                        + $this->subscriptionEventCount($seller),
                    'staff_events' => $this->staffAccessEventCount($seller),
                    'finance_events' => $this->withdrawalEventCount($seller)
                        + $this->payrollEventCount($seller)
                        + $this->procurementEventCount($seller),
                    'billing_events' => $this->subscriptionEventCount($seller),
                    'latest_event_at' => $latestEntry,
                ],
                'entries' => $entries,
            ],
        ]);
    }

    private function staffAccessEntries(User $seller): Collection
    {
        if (!$this->tableExists('staff_access_audits')) {
            return collect();
        }

        return StaffAccessAudit::query()
            ->with([
                'actor:id,name',
                'staffUser:id,name,email',
                'employee:id,name,role',
            ])
            ->where('seller_owner_id', $seller->id)
            ->latest()
            ->limit(12)
            ->get()
            ->map(function (StaffAccessAudit $audit): array {
                $changes = collect((array) data_get($audit->details, 'changes'))
                    ->filter(fn ($change) => filled($change))
                    ->values()
                    ->all();

                return $this->entry(
                    id: "staff-access-{$audit->id}",
                    category: 'staff',
                    title: $this->staffAccessTitle($audit->event),
                    summary: $audit->summary,
                    status: 'completed',
                    occurredAt: optional($audit->created_at)?->toIso8601String(),
                    actorName: $audit->actor?->name,
                    subject: $audit->employee?->name ?? $audit->staffUser?->name,
                    reference: $audit->staffUser?->email,
                    detailLines: $changes,
                    targetUrl: route('hr.index'),
                    targetLabel: 'Open HR',
                );
            });
    }

    private function withdrawalEntries(User $seller): Collection
    {
        if (!$this->tableExists('seller_wallet_withdrawal_requests')) {
            return collect();
        }

        return SellerWalletWithdrawalRequest::query()
            ->with(['reviewedBy:id,name'])
            ->where('user_id', $seller->id)
            ->latest()
            ->limit(10)
            ->get()
            ->map(function (SellerWalletWithdrawalRequest $request) use ($seller): array {
                $status = strtolower((string) $request->status);

                return $this->entry(
                    id: "payout-{$request->id}",
                    category: 'finance',
                    title: match ($status) {
                        SellerWalletWithdrawalRequest::STATUS_APPROVED => 'Payout Request Approved',
                        SellerWalletWithdrawalRequest::STATUS_REJECTED => 'Payout Request Rejected',
                        default => 'Payout Request Submitted',
                    },
                    summary: match ($status) {
                        SellerWalletWithdrawalRequest::STATUS_APPROVED => 'Platform accounting approved this payout request.',
                        SellerWalletWithdrawalRequest::STATUS_REJECTED => 'Platform accounting rejected this payout request.',
                        default => 'Waiting for platform review.',
                    },
                    status: $status,
                    occurredAt: optional($request->reviewed_at ?? $request->created_at)?->toIso8601String(),
                    actorName: $request->reviewedBy?->name ?? $seller->name,
                    amountLabel: $this->formatPeso((float) $request->amount),
                    detailLines: array_values(array_filter([
                        $request->note ? "Seller note: {$request->note}" : null,
                        $request->rejection_reason ? "Reason: {$request->rejection_reason}" : null,
                    ])),
                    targetUrl: route('seller.wallet.index'),
                    targetLabel: 'Open Wallet',
                );
            });
    }

    private function payrollEntries(User $seller): Collection
    {
        if (!$this->tableExists('payrolls')) {
            return collect();
        }

        return Payroll::query()
            ->with(['requester:id,name'])
            ->where('user_id', $seller->id)
            ->latest()
            ->limit(10)
            ->get()
            ->map(function (Payroll $payroll) use ($seller): array {
                $status = strtolower((string) $payroll->status);

                return $this->entry(
                    id: "payroll-{$payroll->id}",
                    category: 'finance',
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
                    occurredAt: optional($status === 'pending' ? $payroll->created_at : $payroll->updated_at)?->toIso8601String(),
                    actorName: $payroll->requester?->name ?? $seller->name,
                    subject: $payroll->month,
                    amountLabel: $this->formatPeso((float) $payroll->total_amount),
                    reference: $payroll->employee_count ? "{$payroll->employee_count} employee(s)" : null,
                    detailLines: array_values(array_filter([
                        $payroll->rejection_reason ? "Reason: {$payroll->rejection_reason}" : null,
                    ])),
                    targetUrl: route('accounting.index'),
                    targetLabel: 'Open Accounting',
                );
            });
    }

    private function procurementEntries(User $seller): Collection
    {
        if (!$this->tableExists('stock_requests')) {
            return collect();
        }

        return StockRequest::query()
            ->with(['supply:id,name', 'requester:id,name'])
            ->where('user_id', $seller->id)
            ->latest()
            ->limit(10)
            ->get()
            ->map(function (StockRequest $request) use ($seller): array {
                $status = strtolower((string) $request->status);
                $supplyName = $request->supply?->name ?? "Supply #{$request->supply_id}";

                return $this->entry(
                    id: "procurement-{$request->id}",
                    category: 'finance',
                    title: match ($status) {
                        StockRequest::STATUS_REJECTED => 'Procurement Request Rejected',
                        StockRequest::STATUS_PENDING => 'Procurement Request Submitted',
                        StockRequest::STATUS_ACCOUNTING_APPROVED => 'Procurement Funds Released',
                        default => 'Procurement Request Updated',
                    },
                    summary: match ($status) {
                        StockRequest::STATUS_REJECTED => "{$supplyName} request was rejected.",
                        StockRequest::STATUS_PENDING => "{$supplyName} request is waiting for accounting review.",
                        StockRequest::STATUS_ACCOUNTING_APPROVED => "{$supplyName} request was approved for procurement.",
                        default => "{$supplyName} request moved to {$status}.",
                    },
                    status: $status,
                    occurredAt: optional($status === StockRequest::STATUS_PENDING ? $request->created_at : $request->updated_at)?->toIso8601String(),
                    actorName: $request->requester?->name ?? $seller->name,
                    subject: $supplyName,
                    amountLabel: $this->formatPeso((float) $request->total_cost),
                    reference: $request->quantity ? "{$request->quantity} unit(s)" : null,
                    detailLines: array_values(array_filter([
                        $request->rejection_reason ? "Reason: {$request->rejection_reason}" : null,
                    ])),
                    targetUrl: route('accounting.index'),
                    targetLabel: 'Open Accounting',
                );
            });
    }

    private function subscriptionEntries(User $seller): Collection
    {
        if (!$this->tableExists('subscription_transactions')) {
            return collect();
        }

        return SubscriptionTransaction::query()
            ->where(function ($query) use ($seller) {
                $query->where('user_id', $seller->id)
                    ->orWhere('artisan_id', $seller->id);
            })
            ->latest()
            ->limit(10)
            ->get()
            ->map(function (SubscriptionTransaction $transaction) use ($seller): array {
                $status = strtolower((string) $transaction->status);

                return $this->entry(
                    id: "subscription-{$transaction->id}",
                    category: 'billing',
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
                    occurredAt: optional($transaction->paid_at ?? $transaction->cancelled_at ?? $transaction->updated_at ?? $transaction->created_at)?->toIso8601String(),
                    actorName: $seller->shop_name ?: $seller->name,
                    amountLabel: $this->formatPeso((float) ($transaction->amount_paid ?? $transaction->amount ?? 0)),
                    reference: $transaction->reference_number,
                    detailLines: array_values(array_filter([
                        $transaction->currency ? "Currency: {$transaction->currency}" : null,
                    ])),
                    targetUrl: route('seller.subscription'),
                    targetLabel: 'Open Subscription',
                );
            });
    }

    private function entry(
        string $id,
        string $category,
        string $title,
        string $summary,
        string $status,
        ?string $occurredAt,
        ?string $actorName = null,
        ?string $subject = null,
        ?string $amountLabel = null,
        ?string $reference = null,
        array $detailLines = [],
        ?string $targetUrl = null,
        ?string $targetLabel = null,
    ): array {
        return [
            'id' => $id,
            'category' => $category,
            'title' => $title,
            'summary' => $summary,
            'status' => $status,
            'occurred_at' => $occurredAt,
            'actor_name' => $actorName,
            'subject' => $subject,
            'amount_label' => $amountLabel,
            'reference' => $reference,
            'detail_lines' => array_values(array_filter($detailLines)),
            'target_url' => $targetUrl,
            'target_label' => $targetLabel,
            'sort_at' => $occurredAt ? strtotime($occurredAt) : 0,
        ];
    }

    private function staffAccessEventCount(User $seller): int
    {
        if (!$this->tableExists('staff_access_audits')) {
            return 0;
        }

        return StaffAccessAudit::query()
            ->where('seller_owner_id', $seller->id)
            ->count();
    }

    private function withdrawalEventCount(User $seller): int
    {
        if (!$this->tableExists('seller_wallet_withdrawal_requests')) {
            return 0;
        }

        return SellerWalletWithdrawalRequest::query()
            ->where('user_id', $seller->id)
            ->count();
    }

    private function payrollEventCount(User $seller): int
    {
        if (!$this->tableExists('payrolls')) {
            return 0;
        }

        return Payroll::query()
            ->where('user_id', $seller->id)
            ->count();
    }

    private function procurementEventCount(User $seller): int
    {
        if (!$this->tableExists('stock_requests')) {
            return 0;
        }

        return StockRequest::query()
            ->where('user_id', $seller->id)
            ->count();
    }

    private function subscriptionEventCount(User $seller): int
    {
        if (!$this->tableExists('subscription_transactions')) {
            return 0;
        }

        return SubscriptionTransaction::query()
            ->where(function ($query) use ($seller) {
                $query->where('user_id', $seller->id)
                    ->orWhere('artisan_id', $seller->id);
            })
            ->count();
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
        return 'PHP '.number_format($amount, 2);
    }
}
