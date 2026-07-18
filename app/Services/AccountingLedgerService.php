<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\StockRequest;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AccountingLedgerService
{
    public function getLedgerData(User $seller, string $tab, string $type, string $search): array
    {
        $financials = $this->buildFinancialSnapshot($seller);

        if ($tab === 'pending') {
            $pendingQuery = $this->buildLedgerQuery($seller, 'pending', $type, $search);
            $pendingPaginator = $pendingQuery->paginate(10, ['*'], 'page_pending');
            $serializedPending = $this->enrichAndSerializeLedger($pendingPaginator->getCollection(), $seller, $financials['balance']);
            $pendingPaginator->setCollection(collect($serializedPending));

            $historyPaginator = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 10, 1, [
                'path' => route('accounting.index'),
                'pageName' => 'page_history',
                'query' => request()->query()
            ]);
        } else {
            $historyQuery = $this->buildLedgerQuery($seller, 'history', $type, $search);
            $historyPaginator = $historyQuery->paginate(10, ['*'], 'page_history');
            $serializedHistory = $this->enrichAndSerializeLedger($historyPaginator->getCollection(), $seller, $financials['balance']);
            $historyPaginator->setCollection(collect($serializedHistory));

            $pendingPaginator = new \Illuminate\Pagination\LengthAwarePaginator([], 0, 10, 1, [
                'path' => route('accounting.index'),
                'pageName' => 'page_pending',
                'query' => request()->query()
            ]);
        }

        return [
            'pendingRequests' => $pendingPaginator,
            'history' => $historyPaginator,
            'finances' => [
                'baseFunds' => $financials['base_funds'],
                'revenue' => $financials['revenue'],
                'expenses' => $financials['expenses'],
                'balance' => $financials['balance'],
            ],
        ];
    }

    public function buildFinancialSnapshot(User $seller): array
    {
        $userId = $seller->id;

        $totalRevenue = Order::where('artisan_id', $userId)
            ->where('status', 'Completed')
            ->sum('seller_net_amount');

        $stockExpenses = StockRequest::where('user_id', $userId)
            ->whereIn('status', [
                StockRequest::STATUS_ACCOUNTING_APPROVED,
                StockRequest::STATUS_ORDERED,
                StockRequest::STATUS_PARTIALLY_RECEIVED,
                StockRequest::STATUS_RECEIVED,
                StockRequest::STATUS_COMPLETED,
            ])
            ->sum('total_cost');

        $payrollExpenses = Payroll::where('user_id', $userId)
            ->where('status', 'Paid')
            ->sum('total_amount');

        $totalPayouts = DB::table('payouts')
            ->where('user_id', $userId)
            ->where('status', 'Completed')
            ->sum('amount');

        $baseFunds = (float) ($seller->base_funds ?? 0);
        $totalExpenses = (float) $stockExpenses + (float) $payrollExpenses;
        $currentBalance = $baseFunds + (float) $totalRevenue - $totalExpenses - (float) $totalPayouts;

        return [
            'base_funds' => $baseFunds,
            'revenue' => (float) $totalRevenue,
            'expenses' => $totalExpenses,
            'balance' => $currentBalance,
            'payouts' => (float) $totalPayouts,
        ];
    }

    private function buildLedgerQuery(User $seller, string $statusGroup, string $typeFilter, string $searchQuery)
    {
        $hasSearch = !empty($searchQuery);

        $stockQuery = DB::table('stock_requests')
            ->select([
                'stock_requests.id',
                DB::raw("'stock_request' as type"),
                'stock_requests.status',
                'stock_requests.created_at',
                'stock_requests.updated_at',
                'stock_requests.total_cost as amount',
                $hasSearch ? 'users.name as requester_name' : DB::raw("NULL as requester_name"),
                $hasSearch ? 'users.role as requester_role' : DB::raw("NULL as requester_role"),
                $hasSearch ? 'supplies.name as detail_name' : DB::raw("NULL as detail_name"),
                $hasSearch ? 'supplies.category as detail_category' : DB::raw("NULL as detail_category"),
                DB::raw("NULL as order_number")
            ])
            ->where('stock_requests.user_id', $seller->id);

        if ($hasSearch) {
            $stockQuery->leftJoin('users', 'stock_requests.requested_by_user_id', '=', 'users.id')
                ->leftJoin('supplies', 'stock_requests.supply_id', '=', 'supplies.id');
        }

        if ($statusGroup === 'pending') {
            $stockQuery->where('stock_requests.status', StockRequest::STATUS_PENDING);
        } else {
            $stockQuery->whereIn('stock_requests.status', [
                StockRequest::STATUS_ACCOUNTING_APPROVED,
                StockRequest::STATUS_ORDERED,
                StockRequest::STATUS_PARTIALLY_RECEIVED,
                StockRequest::STATUS_RECEIVED,
                StockRequest::STATUS_COMPLETED,
                StockRequest::STATUS_REJECTED,
            ]);
        }

        $payrollQuery = DB::table('payrolls')
            ->select([
                'payrolls.id',
                DB::raw("'payroll' as type"),
                'payrolls.status',
                'payrolls.created_at',
                'payrolls.updated_at',
                'payrolls.total_amount as amount',
                $hasSearch ? 'users.name as requester_name' : DB::raw("NULL as requester_name"),
                $hasSearch ? 'users.role as requester_role' : DB::raw("NULL as requester_role"),
                'payrolls.month as detail_name',
                DB::raw("NULL as detail_category"),
                DB::raw("NULL as order_number")
            ])
            ->where('payrolls.user_id', $seller->id);

        if ($hasSearch) {
            $payrollQuery->leftJoin('users', 'payrolls.requested_by_user_id', '=', 'users.id');
        }

        if ($statusGroup === 'pending') {
            $payrollQuery->where('payrolls.status', 'Pending');
        } else {
            $payrollQuery->whereIn('payrolls.status', ['Paid', 'Rejected']);
        }

        $salesQuery = null;
        if ($statusGroup === 'history') {
            $salesQuery = DB::table('orders')
                ->select([
                    'orders.id',
                    DB::raw("'sale' as type"),
                    'orders.status',
                    'orders.created_at',
                    'orders.updated_at',
                    'orders.seller_net_amount as amount',
                    'orders.customer_name as requester_name',
                    DB::raw("'buyer' as requester_role"),
                    DB::raw("NULL as detail_name"),
                    DB::raw("NULL as detail_category"),
                    'orders.order_number'
                ])
                ->where('orders.artisan_id', $seller->id)
                ->where('orders.status', 'Completed');
        }

        $payoutQuery = DB::table('payouts')
            ->select([
                'payouts.id',
                DB::raw("'payout' as type"),
                'payouts.status',
                'payouts.created_at',
                'payouts.updated_at',
                'payouts.amount as amount',
                DB::raw("NULL as requester_name"),
                DB::raw("NULL as requester_role"),
                'payouts.payout_method as detail_name',
                'payouts.reference_number as detail_category',
                DB::raw("NULL as order_number")
            ])
            ->where('payouts.user_id', $seller->id);

        if ($statusGroup === 'pending') {
            $payoutQuery->whereRaw('1 = 0');
        } else {
            $payoutQuery->where('payouts.status', 'Completed');
        }

        if ($typeFilter !== 'all') {
            if ($typeFilter === 'stock_request') {
                $unionQuery = $stockQuery;
            } elseif ($typeFilter === 'payroll') {
                $unionQuery = $payrollQuery;
            } elseif ($typeFilter === 'sale' && $salesQuery) {
                $unionQuery = $salesQuery;
            } elseif ($typeFilter === 'payout') {
                $unionQuery = $payoutQuery;
            } else {
                $unionQuery = $stockQuery->whereRaw('1 = 0');
            }
        } else {
            if ($salesQuery) {
                $unionQuery = $stockQuery->union($payrollQuery)->union($salesQuery)->union($payoutQuery);
            } else {
                $unionQuery = $stockQuery->union($payrollQuery)->union($payoutQuery);
            }
        }

        $outerQuery = DB::table(DB::raw("({$unionQuery->toSql()}) as union_table"))
            ->mergeBindings($unionQuery);

        if (!empty($searchQuery)) {
            $outerQuery->where(function ($q) use ($searchQuery) {
                $term = '%' . $searchQuery . '%';
                $q->where('id', 'like', $term)
                  ->orWhere('status', 'like', $term)
                  ->orWhere('requester_name', 'like', $term)
                  ->orWhere('detail_name', 'like', $term)
                  ->orWhere('detail_category', 'like', $term)
                  ->orWhere('order_number', 'like', $term);
            });
        }

        if ($statusGroup === 'pending') {
            $outerQuery->orderBy('created_at', 'desc');
        } else {
            $outerQuery->orderBy(DB::raw("COALESCE(updated_at, created_at)"), 'desc');
        }

        return $outerQuery;
    }

    private function enrichAndSerializeLedger($items, User $seller, float $currentBalance): array
    {
        $items = collect($items);
        $stockRequestIds = $items->where('type', 'stock_request')->pluck('id');
        $payrollIds = $items->where('type', 'payroll')->pluck('id');
        $orderIds = $items->where('type', 'sale')->pluck('id');
        $payoutIds = $items->where('type', 'payout')->pluck('id');

        $stockRequests = $stockRequestIds->isEmpty()
            ? collect()
            : StockRequest::with(['supply', 'requester:id,name,role', 'user:id,name,role'])
                ->whereIn('id', $stockRequestIds)
                ->get()
                ->keyBy('id');

        $payrolls = $payrollIds->isEmpty()
            ? collect()
            : Payroll::with(['items.employee', 'requester:id,name,role', 'user:id,name,role'])
                ->whereIn('id', $payrollIds)
                ->get()
                ->keyBy('id');

        $orders = $orderIds->isEmpty()
            ? collect()
            : Order::whereIn('id', $orderIds)
                ->get()
                ->keyBy('id');

        $payouts = $payoutIds->isEmpty()
            ? collect()
            : DB::table('payouts')
                ->whereIn('id', $payoutIds)
                ->get()
                ->keyBy('id');

        return $items->map(function ($item) use ($stockRequests, $payrolls, $orders, $payouts, $seller, $currentBalance) {
            if ($item->type === 'stock_request') {
                $model = $stockRequests->get($item->id);
                return $model ? $this->serializeStockRequest($model, $currentBalance) : null;
            } elseif ($item->type === 'payroll') {
                $model = $payrolls->get($item->id);
                return $model ? $this->serializePayroll($model, $seller, $currentBalance) : null;
            } elseif ($item->type === 'sale') {
                $model = $orders->get($item->id);
                return $model ? $this->serializeOrder($model) : null;
            } elseif ($item->type === 'payout') {
                $model = $payouts->get($item->id);
                return $model ? $this->serializePayout($model) : null;
            }
            return null;
        })->filter()->values()->all();
    }

    private function serializeStockRequest(StockRequest $request, float $currentBalance): array
    {
        $request->loadMissing(['supply', 'requester', 'user']);

        $supply = $request->supply;
        $requester = $this->resolveRequester($request);
        $amount = (float) $request->total_cost;

        return [
            'id' => $request->id,
            'type' => 'procurement',
            'status' => $request->status,
            'created_at' => $request->created_at?->toIso8601String(),
            'updated_at' => $request->updated_at?->toIso8601String(),
            'rejection_reason' => $request->rejection_reason,
            'amount' => $amount,
            'quantity' => (int) $request->quantity,
            'requester' => $this->serializeRequester($requester),
            'activity' => $this->buildActivitySummary(
                $request->status,
                $request->created_at?->toIso8601String(),
                null,
                $request->updated_at?->toIso8601String()
            ),
            'supply' => [
                'id' => $supply?->id,
                'name' => $supply?->name,
                'category' => $supply?->category,
                'supplier' => $supply?->supplier,
                'unit' => $supply?->unit,
                'current_stock' => (int) ($supply?->quantity ?? 0),
                'min_stock' => (int) ($supply?->min_stock ?? 0),
                'max_stock' => (int) ($supply?->max_stock ?? 0),
                'available_capacity' => $supply ? (int) $supply->getAvailableCapacity() : 0,
                'unit_cost' => (float) ($supply?->unit_cost ?? 0),
            ],
            'fund_snapshot' => [
                'available_balance' => $currentBalance,
                'remaining_balance' => $currentBalance - $amount,
            ],
        ];
    }

    private function serializePayroll(Payroll $payroll, User $seller, float $currentBalance): array
    {
        $payroll->loadMissing(['items.employee', 'requester', 'user']);

        $workingDays = max((int) ($seller->payroll_working_days ?? 22), 1);
        $requester = $this->resolveRequester($payroll);
        $amount = (float) $payroll->total_amount;

        return [
            'id' => $payroll->id,
            'type' => 'payroll',
            'month' => $payroll->month,
            'status' => $payroll->status,
            'created_at' => $payroll->created_at?->toIso8601String(),
            'updated_at' => $payroll->updated_at?->toIso8601String(),
            'submitted_at' => $payroll->submitted_at?->toIso8601String(),
            'rejection_reason' => $payroll->rejection_reason,
            'employee_count' => (int) $payroll->employee_count,
            'amount' => $amount,
            'requester' => $this->serializeRequester($requester),
            'activity' => $this->buildActivitySummary(
                $payroll->status,
                $payroll->created_at?->toIso8601String(),
                $payroll->submitted_at?->toIso8601String(),
                $payroll->updated_at?->toIso8601String()
            ),
            'fund_snapshot' => [
                'available_balance' => $currentBalance,
                'remaining_balance' => $currentBalance - $amount,
            ],
            'line_items' => $payroll->items->map(function (PayrollItem $item) use ($workingDays) {
                $dailyRate = $workingDays > 0 ? ((float) $item->base_salary / $workingDays) : 0;
                $hourlyRate = $dailyRate / 8;

                return [
                    'id' => $item->id,
                    'employee_name' => $item->employee?->name ?? "Employee #{$item->employee_id}",
                    'base_salary' => (float) $item->base_salary,
                    'days_worked' => (float) $item->days_worked,
                    'absences_days' => (float) $item->absences_days,
                    'absence_deduction' => round((float) $item->absences_days * $dailyRate, 2),
                    'undertime_hours' => (float) $item->undertime_hours,
                    'undertime_deduction' => round((float) $item->undertime_hours * $hourlyRate, 2),
                    'overtime_hours' => (float) $item->overtime_hours,
                    'overtime_pay' => (float) $item->overtime_pay,
                    'net_pay' => (float) $item->net_pay,
                ];
            })->values()->all(),
        ];
    }

    private function serializeOrder(Order $order): array
    {
        return [
            'id' => $order->id,
            'type' => 'sale',
            'order_number' => $order->order_number,
            'status' => $order->status,
            'created_at' => $order->created_at?->toIso8601String(),
            'updated_at' => $order->updated_at?->toIso8601String(),
            'amount' => (float) $order->seller_net_amount,
            'requester' => [
                'name' => $order->customer_name,
                'role' => 'buyer',
            ],
            'financials' => [
                'gross_sales' => (float) $order->merchandise_subtotal,
                'shipping_fee' => (float) $order->shipping_fee_amount,
                'platform_fee' => (float) $order->platform_commission_amount,
                'convenience_fee' => (float) $order->convenience_fee_amount,
                'net_payout' => (float) $order->seller_net_amount,
                'total_charged' => (float) $order->total_amount,
            ],
            'activity' => [
                'requested_at' => $order->created_at?->toIso8601String(),
                'submitted_at' => $order->created_at?->toIso8601String(),
                'last_reviewed_at' => $order->updated_at?->toIso8601String(),
            ]
        ];
    }

    private function serializePayout(object $payout): array
    {
        $createdAtStr = $payout->created_at ? \Illuminate\Support\Carbon::parse($payout->created_at)->toIso8601String() : null;
        $updatedAtStr = $payout->updated_at ? \Illuminate\Support\Carbon::parse($payout->updated_at)->toIso8601String() : null;

        return [
            'id' => $payout->id,
            'type' => 'payout',
            'status' => $payout->status,
            'created_at' => $createdAtStr,
            'updated_at' => $updatedAtStr,
            'amount' => (float) $payout->amount,
            'requester' => [
                'name' => 'System Admin',
                'role' => 'super_admin',
            ],
            'detail_name' => $payout->payout_method,
            'detail_category' => $payout->reference_number,
            'financials' => [
                'gross_sales' => 0.00,
                'shipping_fee' => 0.00,
                'platform_fee' => 0.00,
                'convenience_fee' => 0.00,
                'net_payout' => -((float) $payout->amount),
                'total_charged' => -((float) $payout->amount),
                'payout_method' => $payout->payout_method,
                'account_name' => $payout->payout_account_name,
                'account_number' => $payout->payout_account_number,
                'reference_number' => $payout->reference_number,
            ],
            'activity' => [
                'requested_at' => $createdAtStr,
                'submitted_at' => $createdAtStr,
                'last_reviewed_at' => $updatedAtStr,
            ]
        ];
    }

    private function resolveRequester(object $record): ?User
    {
        return $record->requester ?? $record->user ?? null;
    }

    private function serializeRequester(?User $requester): ?array
    {
        if (!$requester) {
            return null;
        }

        return [
            'id' => $requester->id,
            'name' => $requester->name,
            'role' => $requester->role,
        ];
    }

    private function buildActivitySummary(?string $status, ?string $createdAt, ?string $submittedAt, ?string $updatedAt): array
    {
        $normalizedStatus = strtolower((string) $status);
        $isResolved = in_array($normalizedStatus, ['paid', 'completed', 'accounting_approved', 'ordered', 'received', 'partially_received', 'rejected'], true);

        return [
            'requested_at' => $createdAt,
            'submitted_at' => $submittedAt,
            'last_reviewed_at' => $isResolved ? $updatedAt : null,
        ];
    }

    public function getExportData(User $seller): array
    {
        $financials = $this->buildFinancialSnapshot($seller);

        $pendingRelease = StockRequest::with(['supply', 'requester:id,name,role', 'user:id,name,role'])
            ->where('user_id', $seller->id)
            ->where('status', StockRequest::STATUS_PENDING)
            ->latest()
            ->get();

        $releasedHistory = StockRequest::with(['supply', 'requester:id,name,role', 'user:id,name,role'])
            ->where('user_id', $seller->id)
            ->whereIn('status', [
                StockRequest::STATUS_ACCOUNTING_APPROVED,
                StockRequest::STATUS_ORDERED,
                StockRequest::STATUS_PARTIALLY_RECEIVED,
                StockRequest::STATUS_RECEIVED,
                StockRequest::STATUS_COMPLETED,
                StockRequest::STATUS_REJECTED,
            ])
            ->latest()
            ->take(50)
            ->get();

        $pendingPayrolls = Payroll::with(['requester:id,name,role', 'user:id,name,role'])
            ->where('user_id', $seller->id)
            ->where('status', 'Pending')
            ->latest()
            ->get();

        $payrollHistory = Payroll::with(['requester:id,name,role', 'user:id,name,role'])
            ->where('user_id', $seller->id)
            ->whereIn('status', ['Paid', 'Rejected'])
            ->latest()
            ->take(50)
            ->get();

        return [
            'financials' => $financials,
            'pendingRelease' => $pendingRelease,
            'releasedHistory' => $releasedHistory,
            'pendingPayrolls' => $pendingPayrolls,
            'payrollHistory' => $payrollHistory,
        ];
    }
}
