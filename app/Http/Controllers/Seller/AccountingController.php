<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Models\Payroll;
use App\Models\StockRequest;
use App\Models\User;
use App\Models\CapitalAdjustment;
use App\Notifications\AccountingRejectedNotification;
use App\Services\AccountingLedgerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class AccountingController extends Controller
{
    use InteractsWithSellerContext;

    protected $ledgerService;

    public function __construct(AccountingLedgerService $ledgerService)
    {
        $this->ledgerService = $ledgerService;
    }

    public function index(Request $request)
    {
        $seller = $this->sellerOwner();
        $search = $request->query('search', '');
        $type = $request->query('type', 'all');
        $tab = $request->query('tab', 'pending');

        $ledgerData = $this->ledgerService->getLedgerData($seller, $tab, $type, $search);

        return Inertia::render('Seller/Accounting/FundRelease', [
            'pendingRequests' => $ledgerData['pendingRequests'],
            'pendingPayrolls' => [], // Combined in pendingRequests data list
            'history' => $ledgerData['history'],
            'payrollHistory' => [], // Combined in history data list
            'salesHistory' => [], // Combined in history data list
            'finances' => $ledgerData['finances'],
        ]);
    }

    public function export()
    {
        $seller = $this->sellerOwner();
        $exportData = $this->ledgerService->getExportData($seller);

        $financials = $exportData['financials'];
        $pendingRelease = $exportData['pendingRelease'];
        $releasedHistory = $exportData['releasedHistory'];
        $pendingPayrolls = $exportData['pendingPayrolls'];
        $payrollHistory = $exportData['payrollHistory'];

        $headers = [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="finance_ledger_' . now()->format('Y-m-d_H-i-s') . '.csv"',
        ];

        $callback = function () use ($financials, $pendingRelease, $releasedHistory, $pendingPayrolls, $payrollHistory) {
            $file = fopen('php://output', 'w');

            fputcsv($file, ['FINANCE SNAPSHOT']);
            fputcsv($file, ['Base Funds', 'Revenue', 'Expenses', 'Current Balance']);
            fputcsv($file, [$financials['base_funds'], $financials['revenue'], $financials['expenses'], $financials['balance']]);

            fputcsv($file, []);
            fputcsv($file, ['PENDING INVENTORY REQUESTS']);
            fputcsv($file, ['Request ID', 'Supply', 'Requester', 'Quantity', 'Amount', 'Status', 'Created At']);
            foreach ($pendingRelease as $request) {
                fputcsv($file, [
                    $request->id,
                    $request->supply?->name,
                    $this->resolveRequester($request)?->name,
                    $request->quantity,
                    $request->total_cost,
                    $request->status,
                    optional($request->created_at)->format('Y-m-d H:i:s'),
                ]);
            }

            fputcsv($file, []);
            fputcsv($file, ['INVENTORY HISTORY']);
            fputcsv($file, ['Request ID', 'Supply', 'Requester', 'Amount', 'Status', 'Reviewed At', 'Reason']);
            foreach ($releasedHistory as $request) {
                fputcsv($file, [
                    $request->id,
                    $request->supply?->name,
                    $this->resolveRequester($request)?->name,
                    $request->total_cost,
                    $request->status,
                    optional($request->updated_at)->format('Y-m-d H:i:s'),
                    $request->rejection_reason,
                ]);
            }

            fputcsv($file, []);
            fputcsv($file, ['PENDING PAYROLL']);
            fputcsv($file, ['Payroll ID', 'Month', 'Requester', 'Employees', 'Amount', 'Status', 'Created At']);
            foreach ($pendingPayrolls as $payroll) {
                fputcsv($file, [
                    $payroll->id,
                    $payroll->month,
                    $this->resolveRequester($payroll)?->name,
                    $payroll->employee_count,
                    $payroll->total_amount,
                    $payroll->status,
                    optional($payroll->created_at)->format('Y-m-d H:i:s'),
                ]);
            }

            fputcsv($file, []);
            fputcsv($file, ['PAYROLL HISTORY']);
            fputcsv($file, ['Payroll ID', 'Month', 'Requester', 'Employees', 'Amount', 'Status', 'Reviewed At', 'Reason']);
            foreach ($payrollHistory as $payroll) {
                fputcsv($file, [
                    $payroll->id,
                    $payroll->month,
                    $this->resolveRequester($payroll)?->name,
                    $payroll->employee_count,
                    $payroll->total_amount,
                    $payroll->status,
                    optional($payroll->updated_at)->format('Y-m-d H:i:s'),
                    $payroll->rejection_reason,
                ]);
            }

            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function approveRelease(StockRequest $stockRequest)
    {
        Gate::authorize('approve', $stockRequest);

        if ($stockRequest->status !== StockRequest::STATUS_PENDING) {
            return back()->with('error', 'Request is not pending.');
        }

        $actor = $this->sellerActor();
        if ($stockRequest->requested_by_user_id && $stockRequest->requested_by_user_id === $actor->id) {
            return back()->with('error', 'Governance Control: Maker-Checker rule violation. You cannot approve a request you initiated.');
        }

        $error = DB::transaction(function () use ($stockRequest) {
            /** @var \App\Models\User $lockedUser */
            $lockedUser = User::where('id', $this->sellerOwnerId())->lockForUpdate()->first();
            
            if (!$lockedUser) {
                throw new \Exception("Seller owner not found during fund release.");
            }

            $currentBalance = $this->ledgerService->buildFinancialSnapshot($lockedUser)['balance'];

            if ($currentBalance < (float) $stockRequest->total_cost) {
                return 'Insufficient funds. Cannot release PHP '.number_format((float) $stockRequest->total_cost, 2);
            }

            StockRequest::where('id', $stockRequest->id)->update(['status' => StockRequest::STATUS_ACCOUNTING_APPROVED]);
            return null;
        });

        if ($error) {
            return back()->with('error', $error);
        }

        return back()->with('success', 'Funds released. Procurement can now proceed.');
    }

    public function rejectRelease(Request $request, StockRequest $stockRequest)
    {
        Gate::authorize('reject', $stockRequest);

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
        Gate::authorize('approve', $payroll);

        if ($payroll->status !== 'Pending') {
            return back()->with('error', 'Payroll is not pending.');
        }

        $actor = $this->sellerActor();
        if ($payroll->requested_by_user_id && $payroll->requested_by_user_id === $actor->id) {
            return back()->with('error', 'Governance Control: Maker-Checker rule violation. You cannot approve a request you initiated.');
        }

        $error = DB::transaction(function () use ($payroll) {
            /** @var \App\Models\User $lockedUser */
            $lockedUser = User::where('id', $this->sellerOwnerId())->lockForUpdate()->first();
            
            if (!$lockedUser) {
                throw new \Exception("Seller owner not found during payroll approval.");
            }

            $currentBalance = $this->ledgerService->buildFinancialSnapshot($lockedUser)['balance'];

            if ($currentBalance < (float) $payroll->total_amount) {
                return 'Insufficient funds. Cannot release payroll of PHP '.number_format((float) $payroll->total_amount, 2);
            }

            Payroll::where('id', $payroll->id)->update(['status' => 'Paid']);
            return null;
        });

        if ($error) {
            return back()->with('error', $error);
        }

        return back()->with('success', 'Payroll approved and funds released.');
    }

    public function rejectPayroll(Request $request, Payroll $payroll)
    {
        Gate::authorize('reject', $payroll);

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

        $seller = $this->sellerOwner();
        $actor = $this->sellerActor();
        $oldFunds = (float) ($seller->base_funds ?? 0);
        $newFunds = (float) $request->base_funds;

        if ($oldFunds !== $newFunds) {
            DB::transaction(function () use ($seller, $actor, $oldFunds, $newFunds) {
                $lockedUser = User::where('id', $seller->id)->lockForUpdate()->firstOrFail();
                $lockedUser->update(['base_funds' => $newFunds]);

                CapitalAdjustment::create([
                    'user_id' => $seller->id,
                    'adjusted_by_user_id' => $actor->id,
                    'previous_amount' => $oldFunds,
                    'new_amount' => $newFunds,
                    'memo' => 'Capital balance manually adjusted via accounting panel.',
                ]);
            });
        }

        return back()->with('success', 'Starting balance updated successfully.');
    }

    private function resolveRequester(object $record): ?User
    {
        return $record->requester ?? $record->user ?? null;
    }
}
