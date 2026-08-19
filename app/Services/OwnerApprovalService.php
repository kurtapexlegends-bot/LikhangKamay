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
use App\Models\Product;
use App\Support\HRWorkflowHelper;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class OwnerApprovalService
{
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
        return OwnerApproval::create([
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
                'deductions' => (float) (($item['absence_deduction'] ?? 0) + ($item['undertime_deduction'] ?? 0)),
                'overtime_pay' => (float) ($item['overtime_pay'] ?? 0),
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
            'gross_total' => (float) ($serialized['summary']['base_pay'] ?? $payroll->total_amount),
            'total_deductions' => (float) ($serialized['summary']['deductions'] ?? 0),
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
            'old_rate' => (float) $employee->salary,
            'new_rate' => (float) $newRate,
            'effective_date' => $effectiveDate ?? now()->addMonth()->startOfMonth()->toDateString(),
            'justification' => $justification,
        ];
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
     * Approve a pending request and execute domain side-effects.
     */
    public function approve(OwnerApproval $approval, User $reviewer): bool
    {
        if ($approval->status !== OwnerApproval::STATUS_PENDING) {
            return false;
        }

        return DB::transaction(function () use ($approval, $reviewer) {
            $locked = OwnerApproval::query()->lockForUpdate()->findOrFail($approval->id);
            if ($locked->status !== OwnerApproval::STATUS_PENDING) {
                return false;
            }

            // Apply underlying domain logic if applicable
            $this->executeApprovedDomainAction($locked);

            $locked->update([
                'status' => OwnerApproval::STATUS_APPROVED,
                'reviewer_id' => $reviewer->id,
                'reviewed_at' => now(),
                'rejection_reason' => null,
            ]);

            return true;
        });
    }

    /**
     * Reject a pending request with an optional explanation note.
     */
    public function reject(OwnerApproval $approval, User $reviewer, ?string $reason = null): bool
    {
        if ($approval->status !== OwnerApproval::STATUS_PENDING) {
            return false;
        }

        return DB::transaction(function () use ($approval, $reviewer, $reason) {
            $locked = OwnerApproval::query()->lockForUpdate()->findOrFail($approval->id);
            if ($locked->status !== OwnerApproval::STATUS_PENDING) {
                return false;
            }

            $locked->update([
                'status' => OwnerApproval::STATUS_REJECTED,
                'reviewer_id' => $reviewer->id,
                'reviewed_at' => now(),
                'rejection_reason' => $reason,
            ]);

            return true;
        });
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
            if ($this->approve($approval, $reviewer)) {
                $count++;
            }
        }

        return $count;
    }

    /**
     * Get aggregate executive KPI statistics for the approvals dashboard.
     *
     * @return array{
     *     pending_count: int,
     *     approved_count: int,
     *     declined_count: int,
     *     active_staff_count: int
     * }
     */
    public function getStats(User $seller): array
    {
        $pendingCount = OwnerApproval::query()
            ->where('seller_id', $seller->id)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->count();

        $approvedCount = OwnerApproval::query()
            ->where('seller_id', $seller->id)
            ->where('status', OwnerApproval::STATUS_APPROVED)
            ->where('reviewed_at', '>=', now()->subDays(30))
            ->count();

        $declinedCount = OwnerApproval::query()
            ->where('seller_id', $seller->id)
            ->where('status', OwnerApproval::STATUS_REJECTED)
            ->where('reviewed_at', '>=', now()->subDays(30))
            ->count();

        $activeStaffCount = $seller->staffMembers()->count();
        if ($activeStaffCount === 0) {
            $activeStaffCount = Employee::query()
                ->where('user_id', $seller->id)
                ->where('status', 'active')
                ->count();
        }

        return [
            'pending_count' => $pendingCount,
            'approved_count' => $approvedCount,
            'declined_count' => $declinedCount,
            'active_staff_count' => $activeStaffCount,
        ];
    }

    /**
     * Count pending items awaiting review for a seller.
     */
    public function getPendingCount(User $seller): int
    {
        return OwnerApproval::query()
            ->where('seller_id', $seller->id)
            ->where('status', OwnerApproval::STATUS_PENDING)
            ->count();
    }

    /**
     * Get paginated approvals for a seller with optional domain and status filtering.
     *
     * @param array<string, mixed> $filters
     */
    public function getPaginatedApprovals(User $seller, array $filters = [], int $perPage = 15): LengthAwarePaginator
    {
        $query = OwnerApproval::query()
            ->with(['requester:id,name,email,role', 'reviewer:id,name,email,role'])
            ->where('seller_id', $seller->id);

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
            $search = '%' . trim((string)$filters['search']) . '%';
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', $search)
                  ->orWhere('summary', 'like', $search);
            });
        }

        return $query->latest()->paginate($perPage)->withQueryString();
    }

    /**
     * Execute live database mutations upon approval.
     */
    protected function executeApprovedDomainAction(OwnerApproval $approval): void
    {
        $payload = $approval->changes_payload ?? [];

        switch ($approval->domain) {
            case OwnerApproval::DOMAIN_STAFF_RATE:
                if (!empty($payload['employee_id']) && isset($payload['new_rate'])) {
                    Employee::query()
                        ->where('id', $payload['employee_id'])
                        ->where('user_id', $approval->seller_id)
                        ->update(['salary' => $payload['new_rate']]);
                }
                break;

            case OwnerApproval::DOMAIN_HR_PAYROLL:
                if ($approval->approvable_id && $approval->approvable instanceof PayrollRun) {
                    $approval->approvable->update(['status' => 'approved']);
                }
                break;

            case OwnerApproval::DOMAIN_PROCUREMENT:
                if ($approval->approvable_id && $approval->approvable instanceof StockRequest) {
                    $approval->approvable->update(['status' => 'approved']);
                }
                break;

            case OwnerApproval::DOMAIN_DISCOUNT:
                if ($approval->approvable_id && $approval->approvable instanceof Discount) {
                    $approval->approvable->update(['is_active' => true]);
                } elseif (!empty($payload['discount_id'])) {
                    Discount::where('id', $payload['discount_id'])
                        ->where('user_id', $approval->seller_id)
                        ->update(['is_active' => true]);
                }
                break;

            default:
                // No automatic side effect required for general review items
                break;
        }
    }
}
