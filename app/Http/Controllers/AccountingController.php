<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Models\Payroll;
use App\Models\PayrollItem;
use App\Models\StockRequest;
use App\Models\User;
use App\Notifications\AccountingRejectedNotification;
use Illuminate\Http\Request;
use Inertia\Inertia;

class AccountingController extends Controller
{
    use InteractsWithSellerContext;

    public function index()
    {
        $seller = $this->sellerOwner();
        $financials = $this->buildFinancialSnapshot($seller);

        $pendingRelease = StockRequest::with(['supply', 'requester:id,name,role', 'user:id,name,role'])
            ->where('user_id', $seller->id)
            ->where('status', StockRequest::STATUS_PENDING)
            ->latest()
            ->get()
            ->map(fn (StockRequest $request) => $this->serializeStockRequest($request, $financials['balance']));

        $pendingPayrolls = Payroll::with(['items.employee', 'requester:id,name,role', 'user:id,name,role'])
            ->where('user_id', $seller->id)
            ->where('status', 'Pending')
            ->latest()
            ->get()
            ->map(fn (Payroll $payroll) => $this->serializePayroll($payroll, $seller, $financials['balance']));

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
            ->take(10)
            ->get()
            ->map(fn (StockRequest $request) => $this->serializeStockRequest($request, $financials['balance']));

        $payrollHistory = Payroll::with(['items.employee', 'requester:id,name,role', 'user:id,name,role'])
            ->where('user_id', $seller->id)
            ->whereIn('status', ['Paid', 'Rejected'])
            ->latest()
            ->take(10)
            ->get()
            ->map(fn (Payroll $payroll) => $this->serializePayroll($payroll, $seller, $financials['balance']));

        return Inertia::render('Seller/Accounting/FundRelease', [
            'pendingRequests' => $pendingRelease,
            'pendingPayrolls' => $pendingPayrolls,
            'history' => $releasedHistory,
            'payrollHistory' => $payrollHistory,
            'finances' => [
                'baseFunds' => $financials['base_funds'],
                'revenue' => $financials['revenue'],
                'expenses' => $financials['expenses'],
                'balance' => $financials['balance'],
            ],
        ]);
    }

    public function approveRelease(StockRequest $stockRequest)
    {
        $this->authorizeSellerOwnership($stockRequest->user_id);

        if ($stockRequest->status !== StockRequest::STATUS_PENDING) {
            return back()->with('error', 'Request is not pending.');
        }

        $currentBalance = $this->buildFinancialSnapshot($this->sellerOwner())['balance'];

        if ($currentBalance < (float) $stockRequest->total_cost) {
            return back()->with('error', 'Insufficient funds. Cannot release PHP '.number_format((float) $stockRequest->total_cost, 2));
        }
        $stockRequest->update(['status' => StockRequest::STATUS_ACCOUNTING_APPROVED]);

        return back()->with('success', 'Funds released. Procurement can now proceed.');
    }

    public function rejectRelease(Request $request, StockRequest $stockRequest)
    {
        $this->authorizeSellerOwnership($stockRequest->user_id);

        if ($stockRequest->status !== StockRequest::STATUS_PENDING) {
            return back()->with('error', 'Only pending stock requests can be rejected.');
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $stockRequest->update([
            'status' => StockRequest::STATUS_REJECTED,
            'rejection_reason' => $validated['reason'],
        ]);

        $stockRequest->loadMissing(['supply', 'requester', 'user']);

        if ($recipient = $this->resolveRequester($stockRequest)) {
            $supplyName = $stockRequest->supply?->name ?? 'the requested supply';

            $recipient->notify(new AccountingRejectedNotification(
                'Stock Request Rejected',
                "Accounting rejected stock request #{$stockRequest->id} for {$supplyName}. Reason: {$validated['reason']}",
                route('stock-requests.index'),
                'stock_request',
                $stockRequest->id,
                $validated['reason']
            ));
        }

        return back()->with('success', 'Fund release rejected.');
    }

    public function approvePayroll(Payroll $payroll)
    {
        $this->authorizeSellerOwnership($payroll->user_id);

        if ($payroll->status !== 'Pending') {
            return back()->with('error', 'Payroll is not pending.');
        }

        $currentBalance = $this->buildFinancialSnapshot($this->sellerOwner())['balance'];

        if ($currentBalance < (float) $payroll->total_amount) {
            return back()->with('error', 'Insufficient funds. Cannot release payroll of PHP '.number_format((float) $payroll->total_amount, 2));
        }

        $payroll->update(['status' => 'Paid']);

        return back()->with('success', 'Payroll approved and funds released.');
    }

    public function rejectPayroll(Request $request, Payroll $payroll)
    {
        $this->authorizeSellerOwnership($payroll->user_id);

        if ($payroll->status !== 'Pending') {
            return back()->with('error', 'Only pending payroll requests can be rejected.');
        }

        $validated = $request->validate([
            'reason' => 'required|string|max:1000',
        ]);

        $payroll->update([
            'status' => 'Rejected',
            'rejection_reason' => $validated['reason'],
        ]);

        $payroll->loadMissing(['requester', 'user']);

        if ($recipient = $this->resolveRequester($payroll)) {
            $recipient->notify(new AccountingRejectedNotification(
                'Payroll Request Rejected',
                "Accounting rejected the payroll request for {$payroll->month}. Reason: {$validated['reason']}",
                route('hr.index'),
                'payroll',
                $payroll->id,
                $validated['reason']
            ));
        }

        return back()->with('success', 'Payroll rejected.');
    }

    public function updateBaseFunds(Request $request) 
    {
        $request->validate([
            'base_funds' => 'required|numeric|min:0'
        ]);

        \App\Models\User::where('id', $this->sellerOwnerId())->update([
            'base_funds' => $request->base_funds
        ]);

        return back()->with('success', 'Starting balance updated successfully.');
    }

    private function buildFinancialSnapshot(User $seller): array
    {
        $userId = $seller->id;

        $totalRevenue = Order::where('artisan_id', $userId)
            ->where('status', 'Completed')
            ->sum('total_amount');

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

        $baseFunds = (float) ($seller->base_funds ?? 0);
        $totalExpenses = (float) $stockExpenses + (float) $payrollExpenses;
        $currentBalance = $baseFunds + (float) $totalRevenue - $totalExpenses;

        return [
            'base_funds' => $baseFunds,
            'revenue' => (float) $totalRevenue,
            'expenses' => $totalExpenses,
            'balance' => $currentBalance,
        ];
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
            'rejection_reason' => $payroll->rejection_reason,
            'employee_count' => (int) $payroll->employee_count,
            'amount' => $amount,
            'requester' => $this->serializeRequester($requester),
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
}