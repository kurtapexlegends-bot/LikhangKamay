<?php

namespace App\Services;

use App\Models\OwnerApproval;
use App\Models\User;
use App\Models\Employee;
use App\Models\Payroll;
use App\Models\PayrollRun;
use App\Models\StockRequest;
use App\Models\Supply;
use App\Models\OrderDispute;
use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use App\Models\SellerActivityLog;
use App\Models\Voucher;
use App\Notifications\OwnerApprovalDecisionNotification;
use App\Notifications\TeamRequestSubmittedNotification;
use App\Services\AccountingLedgerService;
use App\Services\DiscountService;
use App\Support\HRWorkflowHelper;
use App\Support\RevisionSchemaRegistry;
use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;

class OwnerApprovalService
{
    /** @var array<int, string> */
    public const OWNER_ONLY_DOMAINS = [
        OwnerApproval::DOMAIN_HR_PAYROLL,
        OwnerApproval::DOMAIN_PROCUREMENT,
        OwnerApproval::DOMAIN_STAFF_RATE,
        OwnerApproval::DOMAIN_REFUND,
    ];

    /** @var array<int, string> */
    public const MANAGER_REVIEWABLE_DOMAINS = [
        OwnerApproval::DOMAIN_DISCOUNT,
        OwnerApproval::DOMAIN_PRODUCT_DRAFT,
    ];

    public function __construct(
        protected ?AccountingLedgerService $ledgerService = null
    ) {
        $this->ledgerService ??= app(AccountingLedgerService::class);
    }

    /**
     * Domains a given reviewer is permitted to inspect and approve/reject.
     *
     * @return array<int, string>
     */
    public function getReviewableDomainsForUser(?User $user): array
    {
        if (!$user || $user->isSellerOwner() || !$user->isStaff()) {
            return array_merge(self::OWNER_ONLY_DOMAINS, self::MANAGER_REVIEWABLE_DOMAINS);
        }

        if ($user->isStaffManager()) {
            return self::MANAGER_REVIEWABLE_DOMAINS;
        }

        return [];
    }

    public function canReviewerActOnDomain(User $reviewer, string $domain): bool
    {
        if ($reviewer->isSellerOwner()) {
            return true;
        }

        if ($reviewer->isStaffManager()) {
            return in_array($domain, self::MANAGER_REVIEWABLE_DOMAINS, true);
        }

        return false;
    }

    public function forgetPendingCountCache(int $sellerId): void
    {
        Cache::forget("seller_{$sellerId}_pending_approvals_count");
        Cache::forget("seller_{$sellerId}_manager_pending_approvals_count");
    }

    /**
     * Synchronize pending Team Requests when an authorized Accounting/Finance actor resolves them.
     */
    public function syncExternalDecision(
        int $sellerId,
        string $domain,
        string $approvableType,
        int $approvableId,
        string $decision,
        User $reviewer,
        ?string $reason = null
    ): int {
        $status = $decision === OwnerApproval::STATUS_REJECTED
            ? OwnerApproval::STATUS_REJECTED
            : OwnerApproval::STATUS_APPROVED;

        $attributes = [
            'status' => $status,
            'reviewer_id' => $reviewer->id,
            'reviewed_at' => now(),
        ];

        if ($status === OwnerApproval::STATUS_REJECTED && $reason !== null) {
            $attributes['rejection_reason'] = $reason;
        }

        $updated = OwnerApproval::query()
            ->where('seller_id', $sellerId)
            ->where('domain', $domain)
            ->where('approvable_type', $approvableType)
            ->where('approvable_id', $approvableId)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->update($attributes);

        $this->forgetPendingCountCache($sellerId);

        return $updated;
    }

    /**
     * Remove orphaned pending approval rows when the underlying target is deleted or cancelled.
     */
    public function cancelPendingForTarget(
        int $sellerId,
        string $approvableType,
        int $approvableId,
        ?string $domain = null
    ): int {
        if (!$this->supportsOwnerApprovals()) {
            return 0;
        }

        $query = OwnerApproval::query()
            ->where('seller_id', $sellerId)
            ->where('approvable_type', $approvableType)
            ->where('approvable_id', $approvableId)
            ->where('status', OwnerApproval::STATUS_PENDING);

        if ($domain !== null) {
            $query->where('domain', $domain);
        }

        $deleted = $query->delete();
        $this->forgetPendingCountCache($sellerId);

        return $deleted;
    }
    /**
     * Submit an action into the owner approval queue.
     */
    public function submitRequest(
        User $seller,
        User $requester,
        string $domain,
        string $title,
        ?string $summary = null,
        ?Model $approvable = null,
        ?array $payload = null
    ): OwnerApproval {
        $approval = OwnerApproval::create([
            'seller_id' => $seller->id,
            'requester_id' => $requester->id,
            'domain' => $domain,
            'approvable_type' => $approvable ? get_class($approvable) : null,
            'approvable_id' => $approvable?->getKey(),
            'title' => $title,
            'summary' => $summary,
            'changes_payload' => $payload,
            'status' => OwnerApproval::STATUS_PENDING,
        ]);

        SellerActivityLog::recordEvent([
            'seller_owner_id' => $seller->id,
            'actor_user_id' => $requester->id,
            'actor_type' => SellerActivityLog::resolveActorType($requester, 'staff'),
            'category' => 'operations',
            'module' => 'approvals',
            'event_type' => 'approval_requested',
            'severity' => 'info',
            'status' => 'pending',
            'title' => 'Approval Requested',
            'summary' => "{$requester->name} submitted approval request: {$title}",
            'subject_type' => OwnerApproval::class,
            'subject_id' => $approval->id,
            'subject_label' => $title,
            'reference' => 'REQ-' . str_pad((string) $approval->id, 5, '0', STR_PAD_LEFT),
            'details' => [
                'domain' => $domain,
                'summary' => $summary,
            ],
            'target_url' => route('seller.approvals.index', ['status' => 'pending']),
            'target_label' => 'View Approvals',
        ]);

        $this->forgetPendingCountCache($seller->id);
        Cache::forget("user_{$seller->id}_unread_notif_count");

        if ($seller->id !== $requester->id) {
            rescue(fn () => $seller->notify(new TeamRequestSubmittedNotification($approval, $requester)));
        }

        if (in_array($domain, self::MANAGER_REVIEWABLE_DOMAINS, true)) {
            $managers = $seller->staffMembers()
                ->whereNull('suspended_at')
                ->where('id', '!=', $requester->id)
                ->get()
                ->filter(fn (User $staff) => $staff->isStaffManager() && $staff->isWorkspaceAccessEnabled());

            foreach ($managers as $manager) {
                Cache::forget("user_{$manager->id}_unread_notif_count");
                rescue(fn () => $manager->notify(new TeamRequestSubmittedNotification($approval, $requester)));
            }
        }

        return $approval;
    }

    /**
     * Build an accurate, itemized payload snapshot from a live Payroll model.
     */
    public function buildPayrollPayload(Payroll $payroll, User $seller): array
    {
        $serialized = HRWorkflowHelper::serializePayrollRun($payroll->loadMissing([
            'items.employee' => fn($query) => $query->withTrashed(),
            'requester'
        ]), $seller);

        $lineItems = collect($serialized['line_items'] ?? [])->map(function ($item) {
            return [
                'name' => $item['employee_name'] ?? 'Employee',
                'role' => $item['employee_role'] ?? null,
                'base_salary' => (float) ($item['base_salary'] ?? 0),
                'days_worked' => (float) ($item['days_worked'] ?? 0),
                'undertime' => (float) ($item['undertime_deduction'] ?? 0),
                'deductions' => (float) (($item['absence_deduction'] ?? 0) + ($item['undertime_deduction'] ?? 0) + ($item['total_statutory_ee'] ?? 0) + ($item['withholding_tax'] ?? 0)),
                'overtime_pay' => (float) ($item['overtime_pay'] ?? 0),
                'gross_pay' => (float) ($item['gross_pay'] ?? 0),
                'taxable_income' => (float) ($item['taxable_income'] ?? 0),
                'sss_ee' => (float) ($item['sss_ee'] ?? 0),
                'sss_er' => (float) ($item['sss_er'] ?? 0),
                'philhealth_ee' => (float) ($item['philhealth_ee'] ?? 0),
                'philhealth_er' => (float) ($item['philhealth_er'] ?? 0),
                'pagibig_ee' => (float) ($item['pagibig_ee'] ?? 0),
                'pagibig_er' => (float) ($item['pagibig_er'] ?? 0),
                'withholding_tax' => (float) ($item['withholding_tax'] ?? 0),
                'total_statutory_ee' => (float) ($item['total_statutory_ee'] ?? 0),
                'total_statutory_er' => (float) ($item['total_statutory_er'] ?? 0),
                'net_pay' => (float) ($item['net_pay'] ?? 0),
                'payment_method' => 'Direct Payout',
            ];
        })->values()->all();

        return [
            'period' => $payroll->month,
            'staff_count' => (int) $payroll->employee_count,
            'employee_count' => (int) $payroll->employee_count,
            'total_payout' => (float) $payroll->total_amount,
            'net_total' => (float) $payroll->total_amount,
            'gross_total' => (float) ($serialized['summary']['gross_pay'] ?? $serialized['summary']['base_pay'] ?? $payroll->total_amount),
            'total_deductions' => (float) ($serialized['summary']['deductions'] ?? 0),
            'total_tax' => (float) ($serialized['summary']['withholding_tax'] ?? 0),
            'total_statutory_ee' => (float) ($serialized['summary']['total_statutory_ee'] ?? 0),
            'total_statutory_er' => (float) ($serialized['summary']['total_statutory_er'] ?? 0),
            'total_employer_liability' => (float) ($serialized['summary']['total_statutory_er'] ?? 0),
            'notes' => $payroll->notes,
            'breakdown' => $lineItems,
        ];
    }

    /**
     * Build an accurate staff salary rate adjustment payload.
     */
    public function buildStaffRatePayload(
        Employee $employee,
        float $newRate,
        ?string $justification = null,
        ?string $effectiveDate = null
    ): array {
        return [
            'employee_id' => $employee->id,
            'employee_name' => $employee->name,
            'position' => $employee->role,
            'compensation_label' => 'Monthly Salary',
            'rate_unit' => 'monthly',
            'old_rate' => (float) $employee->salary,
            'new_rate' => (float) $newRate,
            'effective_date' => $effectiveDate ?? now()->addMonth()->startOfMonth()->toDateString(),
            'justification' => $justification,
        ];
    }

    /**
     * Build a structured product publishing / price-change payload for Team Requests.
     *
     * @param array<string, mixed> $proposed
     */
    public function buildProductDraftPayload(
        Product $product,
        array $proposed,
        string $action = 'publish',
        ?string $notes = null
    ): array {
        $oldPrice = (float) $product->price;
        $newPrice = isset($proposed['price']) ? (float) $proposed['price'] : $oldPrice;
        $oldCost = (float) ($product->cost_price ?? 0);
        $newCost = isset($proposed['cost_price']) ? (float) $proposed['cost_price'] : $oldCost;
        $marginAmount = max(0, $newPrice - $newCost);
        $marginPercent = $newPrice > 0 ? round(($marginAmount / $newPrice) * 100, 1) : 0.0;

        return [
            'product_id' => $product->id,
            'product_name' => $proposed['name'] ?? $product->name,
            'sku' => $product->sku,
            'category' => $proposed['category'] ?? $product->category,
            'action' => $action,
            'old_status' => $product->status,
            'new_status' => $proposed['status'] ?? $product->status,
            'old_price' => $oldPrice,
            'proposed_price' => $newPrice,
            'price' => $newPrice,
            'old_cost_price' => $oldCost,
            'proposed_cost_price' => $newCost,
            'cost_margin' => 'PHP ' . number_format($newCost, 2) . " ({$marginPercent}% margin)",
            'stock' => (int) ($proposed['stock'] ?? $product->stock),
            'cover_photo_url' => $product->cover_photo_path ? \App\Services\StorageUrl::url($product->cover_photo_path) : null,
            'notes' => $notes,
        ];
    }

    /**
     * Queue or supersede a pending product draft/price-change approval request.
     *
     * @param array<string, mixed> $proposed
     */
    public function queueProductDraftRequest(
        User $seller,
        User $requester,
        Product $product,
        array $proposed,
        string $action = 'publish',
        ?string $notes = null
    ): OwnerApproval {
        $payload = $this->buildProductDraftPayload($product, $proposed, $action, $notes);
        $title = $action === 'publish'
            ? "Publish Product: {$product->name}"
            : "Price Update: {$product->name}";

        $summary = $action === 'publish'
            ? "Staff requested publishing {$product->name} at PHP " . number_format((float) ($payload['proposed_price'] ?? $product->price), 2) . "."
            : "Old Price: PHP " . number_format((float) $product->price, 2) . " -> Proposed: PHP " . number_format((float) ($payload['proposed_price'] ?? $product->price), 2);

        $existingPending = OwnerApproval::query()
            ->where('seller_id', $seller->id)
            ->where('domain', OwnerApproval::DOMAIN_PRODUCT_DRAFT)
            ->where('approvable_type', Product::class)
            ->where('approvable_id', $product->id)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->first();

        if ($existingPending) {
            $existingPending->update([
                'requester_id' => $requester->id,
                'title' => $title,
                'summary' => $summary,
                'changes_payload' => $payload,
            ]);
            $this->forgetPendingCountCache($seller->id);

            return $existingPending->fresh();
        }

        return $this->submitRequest(
            seller: $seller,
            requester: $requester,
            domain: OwnerApproval::DOMAIN_PRODUCT_DRAFT,
            title: $title,
            summary: $summary,
            approvable: $product,
            payload: $payload
        );
    }

    /**
     * Build an accurate procurement restock request payload.
     */
    public function buildProcurementPayload(
        Supply $supply,
        int $quantity,
        ?string $notes = null
    ): array {
        $unitCost = (float) $supply->unit_cost;
        $totalCost = $quantity * $unitCost;

        return [
            'supply_id' => $supply->id,
            'materials' => $supply->name,
            'sku' => $supply->sku,
            'supplier' => $supply->supplier ?? 'Direct Supplier',
            'quantity' => $quantity,
            'current_stock' => (int) $supply->quantity,
            'min_stock' => (int) $supply->min_stock,
            'unit_cost' => $unitCost,
            'estimated_cost' => $totalCost,
            'notes' => $notes,
        ];
    }

    /**
     * Build an itemized discount campaign payload with product price previews.
     *
     * @param array<int, int> $productIds
     */
    public function buildDiscountPayload(Discount $discount, array $productIds): array
    {
        $products = Product::whereIn('id', $productIds)->get(['id', 'name', 'sku', 'price']);
        $type = $discount->type ?? 'percentage';
        $val = (float) ($discount->value ?? 0);
        $display = $type === 'percentage' ? "{$val}% OFF" : "₱" . number_format($val, 2) . " OFF";

        $lineItems = $products->map(function ($p) use ($type, $val) {
            $orig = (float) $p->price;
            $disc = $type === 'percentage'
                ? max(0.00, $orig * (1 - ($val / 100)))
                : max(0.00, $orig - $val);

            return [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'original_price' => $orig,
                'discounted_price' => round($disc, 2),
                'savings' => round($orig - $disc, 2),
            ];
        })->values()->all();

        return [
            'discount_id' => $discount->id,
            'campaign_name' => $discount->name ?: 'Special Promotion',
            'type' => $type,
            'value' => $val,
            'discount_rate' => $display,
            'discount_display' => $display,
            'start_at' => $discount->start_at ? (is_string($discount->start_at) ? $discount->start_at : $discount->start_at->toDateString()) : null,
            'end_at' => $discount->end_at ? (is_string($discount->end_at) ? $discount->end_at : $discount->end_at->toDateString()) : null,
            'schedule' => ($discount->start_at && $discount->end_at) 
                ? ((is_string($discount->start_at) ? $discount->start_at : $discount->start_at->toDateString()) . ' to ' . (is_string($discount->end_at) ? $discount->end_at : $discount->end_at->toDateString()))
                : 'Immediate / Ongoing',
            'promo_stock' => $discount->promo_stock,
            'products_count' => $products->count(),
            'products' => $lineItems,
            'items' => $lineItems,
        ];
    }

    /**
     * Build an itemized shop voucher payload for the Owner Approval Hub.
     */
    public function buildVoucherPayload(Voucher $voucher): array
    {
        $type = $voucher->discount_type ?? Voucher::TYPE_PERCENTAGE;
        $val = (float) ($voucher->discount_value ?? 0);
        $display = $type === Voucher::TYPE_PERCENTAGE
            ? "{$val}% OFF"
            : 'PHP ' . number_format($val, 2) . ' OFF';

        $productIds = array_values(array_filter(array_map('intval', (array) ($voucher->applicable_products ?? []))));
        $products = !empty($productIds)
            ? Product::whereIn('id', $productIds)->get(['id', 'name', 'sku', 'price'])
            : collect();

        $lineItems = $products->map(function ($p) use ($type, $val, $voucher) {
            $orig = (float) $p->price;
            $saved = $type === Voucher::TYPE_PERCENTAGE
                ? round($orig * ($val / 100), 2)
                : $val;
            if ($type === Voucher::TYPE_PERCENTAGE && $voucher->max_discount !== null && (float) $voucher->max_discount > 0) {
                $saved = min($saved, (float) $voucher->max_discount);
            }
            $disc = max(0.00, round($orig - $saved, 2));

            return [
                'id' => $p->id,
                'name' => $p->name,
                'sku' => $p->sku,
                'original_price' => $orig,
                'discounted_price' => $disc,
                'savings' => round($orig - $disc, 2),
            ];
        })->values()->all();

        $schedule = ($voucher->starts_at || $voucher->expires_at)
            ? (($voucher->starts_at ? $voucher->starts_at->toDateString() : 'Immediate') . ' to ' . ($voucher->expires_at ? $voucher->expires_at->toDateString() : 'No Expiry'))
            : 'Immediate / Ongoing';

        return [
            'voucher_id' => $voucher->id,
            'voucher_code' => $voucher->code,
            'campaign_name' => "{$voucher->name} ({$voucher->code})",
            'type' => $type,
            'value' => $val,
            'discount_rate' => $display,
            'discount_display' => $display,
            'scope_type' => $voucher->scope_type ?? Voucher::SCOPE_ALL,
            'applicable_category' => $voucher->applicable_category,
            'target_audience' => $voucher->target_audience ?? Voucher::AUDIENCE_ALL,
            'min_spend' => (float) ($voucher->min_spend ?? 0),
            'max_discount' => $voucher->max_discount !== null ? (float) $voucher->max_discount : null,
            'start_at' => $voucher->starts_at?->toDateString(),
            'end_at' => $voucher->expires_at?->toDateString(),
            'schedule' => $schedule,
            'products_count' => $products->count(),
            'products' => $lineItems,
            'items' => $lineItems,
        ];
    }

    /**
     * Build an accurate refund/return payload snapshot from an Order.
     */
    public function buildRefundPayload(
        Order $order,
        string $actionType = 'refund',
        ?string $resolutionDescription = null
    ): array {
        $proofUrl = null;
        if ($order->return_proof_image) {
            $proofUrl = \App\Services\StorageUrl::url($order->return_proof_image);
        }

        return [
            'order_id' => $order->id,
            'order_number' => $order->order_number,
            'customer_name' => $order->customer_name,
            'refund_amount' => (float) $order->total_amount,
            'amount' => (float) $order->total_amount,
            'buyer_claim' => $order->return_reason,
            'proposed_resolution' => $actionType === 'refund' ? 'Full Refund' : 'Replacement Item',
            'action_type' => $actionType,
            'replacement_description' => $resolutionDescription,
            'evidence_photos' => $proofUrl ? [$proofUrl] : [],
            'payment_method' => $order->payment_method,
            'payment_status' => $order->payment_status,
        ];
    }

    /**
     * Approve a pending request and execute domain side-effects.
     */
    public function approve(OwnerApproval $approval, User $reviewer): bool
    {
        if ($reviewer->id === $approval->requester_id) {
            throw new AuthorizationException('You cannot approve your own submitted request.');
        }

        if (!$this->canReviewerActOnDomain($reviewer, $approval->domain)) {
            throw new AuthorizationException('Only the shop owner can approve this request category.');
        }

        if ($approval->status !== OwnerApproval::STATUS_PENDING) {
            return false;
        }

        return DB::transaction(function () use ($approval, $reviewer) {
            $locked = OwnerApproval::query()->lockForUpdate()->findOrFail($approval->id);
            if ($locked->status !== OwnerApproval::STATUS_PENDING) {
                return false;
            }

            if ($reviewer->id === $locked->requester_id) {
                throw new AuthorizationException('You cannot approve your own submitted request.');
            }

            if (!$this->canReviewerActOnDomain($reviewer, $locked->domain)) {
                throw new AuthorizationException('Only the shop owner can approve this request category.');
            }

            // Apply underlying domain logic if applicable
            $this->executeApprovedDomainAction($locked, $reviewer);

            $locked->update([
                'status' => OwnerApproval::STATUS_APPROVED,
                'reviewer_id' => $reviewer->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
            ]);

            $locked->resolveActiveRevisions();

            $this->forgetPendingCountCache($locked->seller_id);

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $locked->seller_id,
                'actor_user_id' => $reviewer->id,
                'actor_type' => SellerActivityLog::resolveActorType($reviewer, 'owner'),
                'category' => 'operations',
                'module' => 'approvals',
                'event_type' => 'approval_approved',
                'severity' => 'success',
                'status' => 'approved',
                'title' => 'Approval Granted',
                'summary' => "Executive approval granted for: {$locked->title}",
                'subject_type' => OwnerApproval::class,
                'subject_id' => $locked->id,
                'subject_label' => $locked->title,
                'reference' => 'REQ-' . str_pad((string) $locked->id, 5, '0', STR_PAD_LEFT),
                'details' => [
                    'domain' => $locked->domain,
                    'requester_id' => $locked->requester_id,
                ],
                'target_url' => route('seller.approvals.index', ['status' => 'approved']),
                'target_label' => 'View Approvals',
            ]);

            $locked->loadMissing('requester');
            if ($locked->requester && $locked->requester_id !== $reviewer->id) {
                rescue(fn () => $locked->requester->notify(new OwnerApprovalDecisionNotification(
                    approval: $locked,
                    status: OwnerApproval::STATUS_APPROVED,
                    reviewer: $reviewer
                )));
            }

            return true;
        });
    }

    /**
     * Reject a pending request with targeted revision checklist items and optional explanation note.
     */
    public function reject(OwnerApproval $approval, User $reviewer, ?string $reason = null, array $revisionItems = []): bool
    {
        if (!$this->canReviewerActOnDomain($reviewer, $approval->domain)) {
            throw new AuthorizationException('Only the shop owner can decline this request category.');
        }

        if ($approval->status !== OwnerApproval::STATUS_PENDING) {
            return false;
        }

        $schemaKey = match ($approval->approvable_type) {
            StockRequest::class => 'stock_request',
            Payroll::class => 'payroll',
            default => 'owner_approval',
        };

        $normalizedItems = RevisionSchemaRegistry::normalizeItems($schemaKey, $revisionItems);
        $rawNote = trim(strip_tags((string) $reason));
        $formattedReason = RevisionSchemaRegistry::formatSummaryString($normalizedItems, $rawNote);
        $effectiveReason = $formattedReason !== '' ? $formattedReason : ($rawNote !== '' ? $rawNote : null);
        $refundRejectedOrder = null;

        $result = DB::transaction(function () use ($approval, $reviewer, $effectiveReason, $normalizedItems, $rawNote, $schemaKey, &$refundRejectedOrder) {
            $locked = OwnerApproval::query()->lockForUpdate()->findOrFail($approval->id);
            if ($locked->status !== OwnerApproval::STATUS_PENDING) {
                return false;
            }

            if (!$this->canReviewerActOnDomain($reviewer, $locked->domain)) {
                throw new AuthorizationException('Only the shop owner can decline this request category.');
            }

            // Apply underlying domain rejection side-effects
            $refundRejectedOrder = $this->executeRejectedDomainAction($locked, $effectiveReason);

            $locked->update([
                'status' => OwnerApproval::STATUS_REJECTED,
                'reviewer_id' => $reviewer->id,
                'reviewed_at' => now(),
                'rejection_reason' => $effectiveReason,
            ]);

            $locked->recordRevision($schemaKey, $normalizedItems, $rawNote, $reviewer->id);

            $approvable = $locked->approvable;
            if ($approvable && method_exists($approvable, 'recordRevision')) {
                $approvable->recordRevision($schemaKey, $normalizedItems, $rawNote, $reviewer->id);
            }

            $this->forgetPendingCountCache($locked->seller_id);

            SellerActivityLog::recordEvent([
                'seller_owner_id' => $locked->seller_id,
                'actor_user_id' => $reviewer->id,
                'actor_type' => SellerActivityLog::resolveActorType($reviewer, 'owner'),
                'category' => 'operations',
                'module' => 'approvals',
                'event_type' => 'approval_declined',
                'severity' => 'warning',
                'status' => 'rejected',
                'title' => 'Approval Declined',
                'summary' => "Executive request declined for: {$locked->title}" . ($effectiveReason ? ": {$effectiveReason}" : ''),
                'subject_type' => OwnerApproval::class,
                'subject_id' => $locked->id,
                'subject_label' => $locked->title,
                'reference' => 'REQ-' . str_pad((string) $locked->id, 5, '0', STR_PAD_LEFT),
                'details' => [
                    'domain' => $locked->domain,
                    'requester_id' => $locked->requester_id,
                    'reason' => $effectiveReason,
                    'flagged_keys' => array_column($normalizedItems, 'key'),
                ],
                'target_url' => route('seller.approvals.index', ['status' => 'rejected']),
                'target_label' => 'View Approvals',
            ]);

            $locked->loadMissing('requester');
            if ($locked->requester && $locked->requester_id !== $reviewer->id) {
                rescue(fn () => $locked->requester->notify(new OwnerApprovalDecisionNotification(
                    approval: $locked,
                    status: OwnerApproval::STATUS_REJECTED,
                    reviewer: $reviewer,
                    reason: $effectiveReason
                )));
            }

            return true;
        });

        if ($result && $refundRejectedOrder instanceof Order) {
            $refundRejectedOrder->loadMissing('user');
            $buyerEmail = $refundRejectedOrder->user?->email;
            if ($buyerEmail) {
                rescue(fn () => Mail::to($buyerEmail)->queue(new \App\Mail\ReturnRequestRejected($refundRejectedOrder, $effectiveReason)));
            }
        }

        return $result;
    }

    /**
     * Batch approve multiple pending items (Elite feature).
     *
     * @param array<int, int> $approvalIds
     */
    public function batchApprove(User $seller, User $reviewer, array $approvalIds): int
    {
        $approvals = OwnerApproval::query()
            ->where('seller_id', $seller->id)
            ->whereIn('id', $approvalIds)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->get();

        $count = 0;
        foreach ($approvals as $approval) {
            try {
                if ($this->approve($approval, $reviewer)) {
                    $count++;
                }
            } catch (\Throwable $e) {
                \Illuminate\Support\Facades\Log::warning("Batch approve failed for approval #{$approval->id}: " . $e->getMessage());
            }
        }

        $this->forgetPendingCountCache($seller->id);

        return $count;
    }

    /**
     * Check whether the owner_approvals table exists in the connected database.
     */
    public function supportsOwnerApprovals(): bool
    {
        return rescue(fn () => Schema::hasTable('owner_approvals'), false);
    }

    /**
     * Get aggregate executive KPI statistics for the approvals dashboard.
     *
     * @return array{
     *     pending_count: int,
     *     owner_only_pending_count: int,
     *     approved_count: int,
     *     declined_count: int,
     *     active_staff_count: int,
     *     pending_exposure_amount: float,
     *     domain_counts: array<string, int>,
     * }
     */
    public function getStats(User $seller, ?User $viewer = null): array
    {
        $allowedDomains = $this->getReviewableDomainsForUser($viewer);

        if (!$this->supportsOwnerApprovals() || empty($allowedDomains)) {
            return [
                'pending_count' => 0,
                'owner_only_pending_count' => 0,
                'approved_count' => 0,
                'declined_count' => 0,
                'active_staff_count' => 0,
                'pending_exposure_amount' => 0.0,
                'domain_counts' => [],
            ];
        }

        $activeStaffCount = rescue(fn() => $seller->staffMembers()->count(), 0);
        if ($activeStaffCount === 0) {
            $activeStaffCount = rescue(fn() => Employee::query()
                ->where('user_id', $seller->id)
                ->where('status', 'active')
                ->count(), 0);
        }

        $pendingRows = rescue(fn() => OwnerApproval::query()
            ->where('seller_id', $seller->id)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->whereIn('domain', $allowedDomains)
            ->get(['id', 'domain', 'changes_payload']), collect());

        $pendingCount = $pendingRows->count();
        $ownerOnlyPendingCount = $pendingRows->whereIn('domain', self::OWNER_ONLY_DOMAINS)->count();
        $pendingExposure = (float) $pendingRows->sum(function (OwnerApproval $row) {
            $payload = is_array($row->changes_payload) ? $row->changes_payload : [];

            return match ($row->domain) {
                OwnerApproval::DOMAIN_HR_PAYROLL => (float) ($payload['total_payout'] ?? $payload['net_total'] ?? 0),
                OwnerApproval::DOMAIN_PROCUREMENT => (float) ($payload['estimated_cost'] ?? 0),
                OwnerApproval::DOMAIN_REFUND => (float) ($payload['refund_amount'] ?? $payload['amount'] ?? 0),
                default => 0.0,
            };
        });

        $domainCounts = $pendingRows->groupBy('domain')->map->count()->all();

        $approvedCount = rescue(fn() => OwnerApproval::query()
            ->where('seller_id', $seller->id)
            ->where('status', OwnerApproval::STATUS_APPROVED)
            ->whereIn('domain', $allowedDomains)
            ->where('reviewed_at', '>=', now()->subDays(30))
            ->count(), 0);

        $declinedCount = rescue(fn() => OwnerApproval::query()
            ->where('seller_id', $seller->id)
            ->where('status', OwnerApproval::STATUS_REJECTED)
            ->whereIn('domain', $allowedDomains)
            ->where('reviewed_at', '>=', now()->subDays(30))
            ->count(), 0);

        return [
            'pending_count' => $pendingCount,
            'owner_only_pending_count' => $ownerOnlyPendingCount,
            'approved_count' => $approvedCount,
            'declined_count' => $declinedCount,
            'active_staff_count' => $activeStaffCount,
            'pending_exposure_amount' => round($pendingExposure, 2),
            'domain_counts' => $domainCounts,
        ];
    }

    /**
     * Get total pending requests awaiting action by the active reviewer.
     */
    public function getPendingCount(User $seller, ?User $viewer = null): int
    {
        $allowedDomains = $this->getReviewableDomainsForUser($viewer);
        if (!$this->supportsOwnerApprovals() || empty($allowedDomains)) {
            return 0;
        }

        return rescue(fn() => OwnerApproval::query()
            ->where('seller_id', $seller->id)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->whereIn('domain', $allowedDomains)
            ->count(), 0);
    }

    /**
     * Retrieve paginated approvals with filters for the dashboard.
     *
     * @param array<string, mixed> $filters
     */
    public function getPaginatedApprovals(User $seller, array $filters = [], int $perPage = 15, ?User $viewer = null): LengthAwarePaginator
    {
        $allowedDomains = $this->getReviewableDomainsForUser($viewer);
        if (!$this->supportsOwnerApprovals() || empty($allowedDomains)) {
            return new \Illuminate\Pagination\LengthAwarePaginator([], 0, $perPage);
        }

        try {
            $hasRevisionsTable = rescue(fn () => Schema::hasTable('revision_requests'), false);
            $query = OwnerApproval::query()
                ->with($hasRevisionsTable
                    ? ['requester:id,name,email,role,staff_role_preset_key', 'reviewer:id,name,email,role', 'activeRevision.reviewer']
                    : ['requester:id,name,email,role,staff_role_preset_key', 'reviewer:id,name,email,role'])
                ->where('seller_id', $seller->id)
                ->whereIn('domain', $allowedDomains);

            if (!empty($filters['status'])) {
                if ($filters['status'] === 'reviewed') {
                    $query->whereIn('status', [OwnerApproval::STATUS_APPROVED, OwnerApproval::STATUS_REJECTED]);
                } elseif (in_array($filters['status'], [OwnerApproval::STATUS_PENDING, OwnerApproval::STATUS_APPROVED, OwnerApproval::STATUS_REJECTED], true)) {
                    $query->where('status', $filters['status']);
                }
            }

            if (!empty($filters['domain'])) {
                $query->where('domain', $filters['domain']);
            }

            if (!empty($filters['search'])) {
                $like = DB::connection()->getDriverName() === 'pgsql' ? 'ILIKE' : 'like';
                $search = '%' . trim((string)$filters['search']) . '%';
                $query->where(function ($q) use ($search, $like) {
                    $q->where('title', $like, $search)
                      ->orWhere('summary', $like, $search);
                });
            }

            return $query->latest()->paginate($perPage)->withQueryString()->through(function (OwnerApproval $approval) {
                $arr = $approval->toArray();
                $arr['active_revision'] = $approval->formatActiveRevisionForFrontend();
                $arr['authority_scope'] = in_array($approval->domain, self::MANAGER_REVIEWABLE_DOMAINS, true)
                    ? 'manager_or_owner'
                    : 'owner_only';

                return $arr;
            });
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('OwnerApprovalService getPaginatedApprovals fallback: ' . $e->getMessage());
            return new \Illuminate\Pagination\LengthAwarePaginator([], 0, $perPage);
        }
    }

    /**
     * Execute live database mutations upon approval.
     */
    protected function executeApprovedDomainAction(OwnerApproval $approval, ?User $reviewer = null): void
    {
        $payload = $approval->changes_payload ?? [];
        $reviewerActor = $reviewer ?? $approval->reviewer ?? $approval->seller;

        switch ($approval->domain) {
            case OwnerApproval::DOMAIN_STAFF_RATE:
                $employeeId = $approval->approvable_id ?? ($payload['employee_id'] ?? null);
                $newRate = $payload['new_rate'] ?? null;
                if ($employeeId && $newRate !== null) {
                    $employee = $approval->approvable instanceof Employee
                        ? $approval->approvable
                        : Employee::where('id', $employeeId)->where('user_id', $approval->seller_id)->first();

                    if ($employee) {
                        $employee->update(['salary' => $newRate]);
                    }
                }
                break;

            case OwnerApproval::DOMAIN_HR_PAYROLL:
                $payroll = $approval->approvable;
                if (!$payroll && $approval->approvable_id) {
                    $payroll = Payroll::find($approval->approvable_id);
                }

                if ($payroll instanceof Payroll) {
                    if ($payroll->status !== 'Pending') {
                        throw new \RuntimeException('Payroll request is not pending approval.');
                    }

                    /** @var User|null $lockedSeller */
                    $lockedSeller = User::where('id', $approval->seller_id)->lockForUpdate()->first();
                    if (!$lockedSeller) {
                        throw new \RuntimeException("Seller owner not found during payroll approval.");
                    }

                    $currentBalance = $this->ledgerService->buildFinancialSnapshot($lockedSeller)['balance'];
                    if (round($currentBalance, 2) < round((float) $payroll->total_amount, 2)) {
                        throw new \RuntimeException('Insufficient funds. Cannot release payroll of PHP ' . number_format((float) $payroll->total_amount, 2));
                    }

                    Payroll::where('id', $payroll->id)->update(['status' => 'Paid']);
                    $payroll->resolveActiveRevisions();
                } elseif ($payroll instanceof PayrollRun) {
                    $payroll->update(['status' => 'approved']);
                }
                break;

            case OwnerApproval::DOMAIN_PROCUREMENT:
                $stockRequest = $approval->approvable;
                if (!$stockRequest && $approval->approvable_id) {
                    $stockRequest = StockRequest::find($approval->approvable_id);
                }

                if ($stockRequest instanceof StockRequest) {
                    if ($stockRequest->status !== StockRequest::STATUS_PENDING) {
                        throw new \RuntimeException('Stock request is not pending approval.');
                    }

                    /** @var User|null $lockedSeller */
                    $lockedSeller = User::where('id', $approval->seller_id)->lockForUpdate()->first();
                    if ($lockedSeller) {
                        $currentBalance = $this->ledgerService->buildFinancialSnapshot($lockedSeller)['balance'];
                        if (round($currentBalance, 2) < round((float) $stockRequest->total_cost, 2)) {
                            throw new \RuntimeException('Insufficient funds. Cannot release PHP ' . number_format((float) $stockRequest->total_cost, 2));
                        }
                    }

                    StockRequest::where('id', $stockRequest->id)->update(['status' => StockRequest::STATUS_ACCOUNTING_APPROVED]);
                    $stockRequest->resolveActiveRevisions();
                }
                break;

            case OwnerApproval::DOMAIN_DISCOUNT:
                $affectedProductIds = [];
                if ($approval->approvable_id && $approval->approvable instanceof Voucher) {
                    $voucher = $approval->approvable;
                    $seller = $approval->seller ?? User::withTrashed()->find($approval->seller_id);
                    if ($seller && !$voucher->is_active && !$seller->canCreateMoreVouchers()) {
                        $limit = $seller->getActiveVoucherLimit();
                        throw new \RuntimeException("Cannot activate voucher: workshop has reached its active voucher limit ({$limit}).");
                    }
                    $voucher->update(['is_active' => true]);
                } elseif (!empty($payload['voucher_id'])) {
                    $voucher = Voucher::where('id', $payload['voucher_id'])
                        ->where('shop_id', $approval->seller_id)
                        ->first();
                    if ($voucher) {
                        $seller = $approval->seller ?? User::withTrashed()->find($approval->seller_id);
                        if ($seller && !$voucher->is_active && !$seller->canCreateMoreVouchers()) {
                            $limit = $seller->getActiveVoucherLimit();
                            throw new \RuntimeException("Cannot activate voucher: workshop has reached its active voucher limit ({$limit}).");
                        }
                        $voucher->update(['is_active' => true]);
                    }
                } elseif (($payload['mode'] ?? null) === 'update' && ($approval->approvable instanceof Discount || !empty($payload['discount_id']))) {
                    $discount = $approval->approvable instanceof Discount
                        ? $approval->approvable
                        : Discount::where('id', $payload['discount_id'])->where('user_id', $approval->seller_id)->first();
                    if ($discount && !empty($payload['pending_update']) && is_array($payload['pending_update'])) {
                        app(DiscountService::class)->updateDiscount($discount, $payload['pending_update']);
                        $affectedProductIds = $discount->products()->pluck('products.id')->all();
                    }
                } elseif (($payload['mode'] ?? null) === 'deactivate' && ($approval->approvable instanceof Discount || !empty($payload['discount_id']))) {
                    $discount = $approval->approvable instanceof Discount
                        ? $approval->approvable
                        : Discount::where('id', $payload['discount_id'])->where('user_id', $approval->seller_id)->first();
                    if ($discount) {
                        $affectedProductIds = $discount->products()->pluck('products.id')->all();
                        app(DiscountService::class)->deactivateDiscount($discount);
                    }
                } else {
                    $discountIds = collect((array) ($payload['discount_ids'] ?? []))
                        ->when($approval->approvable instanceof Discount, fn ($c) => $c->push($approval->approvable->id))
                        ->when(!empty($payload['discount_id']), fn ($c) => $c->push((int) $payload['discount_id']))
                        ->map(fn ($id) => (int) $id)
                        ->filter()
                        ->unique()
                        ->values()
                        ->all();

                    if (!empty($discountIds)) {
                        $discounts = Discount::where('user_id', $approval->seller_id)
                            ->whereIn('id', $discountIds)
                            ->get();

                        foreach ($discounts as $discount) {
                            $discount->update(['is_active' => true]);
                            $affectedProductIds = array_merge($affectedProductIds, $discount->products()->pluck('products.id')->all());
                        }
                    }
                }

                app(DiscountService::class)->clearSellerProductCaches($approval->seller_id, array_values(array_unique($affectedProductIds)));
                break;

            case OwnerApproval::DOMAIN_PRODUCT_DRAFT:
                $productId = $approval->approvable instanceof Product
                    ? $approval->approvable->id
                    : ($approval->approvable_id ?? ($payload['product_id'] ?? null));

                if ($productId) {
                    $product = Product::where('id', $productId)
                        ->where('user_id', $approval->seller_id)
                        ->lockForUpdate()
                        ->first();

                    if ($product) {
                        $updates = [];
                        if (isset($payload['proposed_price'])) {
                            $updates['price'] = (float) $payload['proposed_price'];
                        }
                        if (isset($payload['proposed_cost_price'])) {
                            $updates['cost_price'] = (float) $payload['proposed_cost_price'];
                        }

                        $targetStatus = $payload['new_status'] ?? null;
                        $action = $payload['action'] ?? ($payload['action_type'] ?? null);
                        $isPriceUpdate = in_array($action, ['price_update', 'price_change'], true);
                        $preserveActive = ($product->status === 'Active' && ($isPriceUpdate || !isset($payload['new_status'])));

                        if ($targetStatus === 'Active') {
                            $sellerOwner = $approval->seller ?? User::withTrashed()->find($approval->seller_id);
                            $readiness = $product->evaluateActivationReadiness();
                            if (!$readiness['canBeActive']) {
                                throw new \RuntimeException('Product cannot be published until required cover, gallery (3-5), and 3D assets are complete.');
                            }
                            if ($product->status !== 'Active' && $sellerOwner && !$sellerOwner->canAddMoreProducts()) {
                                throw new \RuntimeException('Workshop active product limit reached.');
                            }
                            $updates['status'] = 'Active';
                        } elseif ($targetStatus) {
                            $updates['status'] = $targetStatus;
                        }

                        if (!empty($updates)) {
                            if ($preserveActive) {
                                $prevBypass = Product::$bypassReview;
                                Product::$bypassReview = true;
                                try {
                                    $product->update($updates);
                                } finally {
                                    Product::$bypassReview = $prevBypass;
                                }
                            } else {
                                $product->update($updates);
                            }
                        }
                    }
                }
                break;

            case OwnerApproval::DOMAIN_REFUND:
                $order = $approval->approvable;
                if (!$order && $approval->approvable_id) {
                    $order = Order::find($approval->approvable_id);
                }
                if ($order instanceof Order) {
                    if ($order->status !== 'Refund/Return') {
                        throw new \RuntimeException('Order return request is no longer pending review.');
                    }
                    $actionType = $payload['action_type'] ?? 'refund';
                    if ($actionType === 'refund') {
                        app(\App\Actions\Seller\Orders\ApproveOrderRefund::class)->execute($order, $reviewerActor);
                    } else {
                        $desc = $payload['replacement_description'] ?? 'Replacement approved by shop owner.';
                        $seller = $approval->seller ?? User::withTrashed()->find($order->artisan_id);
                        app(\App\Actions\Seller\Orders\ApproveOrderReplacement::class)->execute($order, $desc, $reviewerActor, $seller);
                    }
                }
                break;

            default:
                // No automatic side effect required for general review items
                break;
        }
    }

    /**
     * Execute live database mutations upon rejection.
     */
    protected function executeRejectedDomainAction(OwnerApproval $approval, ?string $reason = null): mixed
    {
        $payload = $approval->changes_payload ?? [];

        switch ($approval->domain) {
            case OwnerApproval::DOMAIN_HR_PAYROLL:
                $payroll = $approval->approvable;
                if (!$payroll && $approval->approvable_id) {
                    $payroll = Payroll::find($approval->approvable_id);
                }
                if ($payroll instanceof Payroll && $payroll->status === 'Pending') {
                    $payroll->update([
                        'status' => 'Rejected',
                        'rejection_reason' => $reason,
                    ]);
                }
                return null;

            case OwnerApproval::DOMAIN_PROCUREMENT:
                $stockRequest = $approval->approvable;
                if (!$stockRequest && $approval->approvable_id) {
                    $stockRequest = StockRequest::find($approval->approvable_id);
                }
                if ($stockRequest instanceof StockRequest && $stockRequest->status === StockRequest::STATUS_PENDING) {
                    $stockRequest->update([
                        'status' => StockRequest::STATUS_REJECTED,
                        'rejection_reason' => $reason,
                    ]);
                }
                return null;

            case OwnerApproval::DOMAIN_DISCOUNT:
                if (in_array($payload['mode'] ?? 'create', ['create'], true)) {
                    $discountIds = collect((array) ($payload['discount_ids'] ?? []))
                        ->when($approval->approvable instanceof Discount, fn ($c) => $c->push($approval->approvable->id))
                        ->when(!empty($payload['discount_id']), fn ($c) => $c->push((int) $payload['discount_id']))
                        ->map(fn ($id) => (int) $id)
                        ->filter()
                        ->unique()
                        ->values()
                        ->all();

                    if (!empty($discountIds)) {
                        Discount::where('user_id', $approval->seller_id)
                            ->whereIn('id', $discountIds)
                            ->get()
                            ->each->update(['is_active' => false]);
                    }
                }
                return null;

            case OwnerApproval::DOMAIN_REFUND:
                $order = $approval->approvable;
                if (!$order && $approval->approvable_id) {
                    $order = Order::find($approval->approvable_id);
                }
                if ($order instanceof Order && $order->status === 'Refund/Return') {
                    $order->update([
                        'status' => 'Completed',
                    ]);
                    return $order;
                }
                return null;

            default:
                return null;
        }
    }
}
