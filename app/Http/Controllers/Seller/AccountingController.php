<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Models\Payroll;
use App\Models\StockRequest;
use App\Models\User;
use App\Models\CapitalAdjustment;
use App\Models\OwnerApproval;
use App\Notifications\AccountingRejectedNotification;
use App\Services\AccountingLedgerService;
use App\Support\RevisionSchemaRegistry;
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
        $queryString = static function (string $key, string $default = '') use ($request): string {
            $val = $request->query($key);

            return is_scalar($val) ? trim((string) $val) : $default;
        };

        $search = $queryString('search', '');
        $type = $queryString('type', 'all') ?: 'all';
        $ledgerStatus = $queryString('ledger_status', 'all') ?: 'all';
        $startDate = AccountingLedgerService::normalizeCalendarDate($request->query('start_date'));
        $endDate = AccountingLedgerService::normalizeCalendarDate($request->query('end_date'));
        $paymentChannel = $queryString('payment_channel', 'all') ?: 'all';
        $tab = $queryString('tab', 'pending') ?: 'pending';

        $ledgerData = $this->ledgerService->getLedgerData(
            $seller,
            $tab,
            $type,
            $search,
            $ledgerStatus,
            $startDate,
            $endDate,
            $paymentChannel
        );

        return Inertia::render('Seller/Accounting/FundRelease', [
            'pendingRequests' => $ledgerData['pendingRequests'],
            'pendingPayrolls' => [], // Combined in pendingRequests data list
            'history' => $ledgerData['history'],
            'payrollHistory' => [], // Combined in history data list
            'salesHistory' => [], // Combined in history data list
            'finances' => $ledgerData['finances'],
            'channelBreakdown' => $ledgerData['channelBreakdown'],
            'filters' => [
                'search' => $search,
                'type' => $type,
                'ledger_status' => $ledgerStatus,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'payment_channel' => $paymentChannel,
                'tab' => $tab,
            ],
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
            fputcsv($file, ['Payroll ID', 'Month', 'Requester', 'Employees', 'Gross Amount', 'Statutory EE', 'Withholding Tax', 'Employer Share', 'Amount', 'Status', 'Created At']);
            foreach ($pendingPayrolls as $payroll) {
                $statutoryEe = $payroll->items ? $payroll->items->sum(fn($i) => ($i->sss_ee ?? 0) + ($i->philhealth_ee ?? 0) + ($i->pagibig_ee ?? 0)) : 0;
                $statutoryEr = $payroll->items ? $payroll->items->sum(fn($i) => ($i->sss_er ?? 0) + ($i->philhealth_er ?? 0) + ($i->pagibig_er ?? 0)) : 0;
                $tax = $payroll->items ? $payroll->items->sum('withholding_tax') : 0;
                $gross = $payroll->items ? ($payroll->items->sum('gross_pay') ?: $payroll->total_amount) : $payroll->total_amount;
                fputcsv($file, [
                    $payroll->id,
                    $payroll->month,
                    $this->resolveRequester($payroll)?->name,
                    $payroll->employee_count,
                    round((float) $gross, 2),
                    round((float) $statutoryEe, 2),
                    round((float) $tax, 2),
                    round((float) $statutoryEr, 2),
                    $payroll->total_amount,
                    $payroll->status,
                    optional($payroll->created_at)->format('Y-m-d H:i:s'),
                ]);
            }

            fputcsv($file, []);
            fputcsv($file, ['PAYROLL HISTORY']);
            fputcsv($file, ['Payroll ID', 'Month', 'Requester', 'Employees', 'Gross Amount', 'Statutory EE', 'Withholding Tax', 'Employer Share', 'Amount', 'Status', 'Reviewed At', 'Reason']);
            foreach ($payrollHistory as $payroll) {
                $statutoryEe = $payroll->items ? $payroll->items->sum(fn($i) => ($i->sss_ee ?? 0) + ($i->philhealth_ee ?? 0) + ($i->pagibig_ee ?? 0)) : 0;
                $statutoryEr = $payroll->items ? $payroll->items->sum(fn($i) => ($i->sss_er ?? 0) + ($i->philhealth_er ?? 0) + ($i->pagibig_er ?? 0)) : 0;
                $tax = $payroll->items ? $payroll->items->sum('withholding_tax') : 0;
                $gross = $payroll->items ? ($payroll->items->sum('gross_pay') ?: $payroll->total_amount) : $payroll->total_amount;
                fputcsv($file, [
                    $payroll->id,
                    $payroll->month,
                    $this->resolveRequester($payroll)?->name,
                    $payroll->employee_count,
                    round((float) $gross, 2),
                    round((float) $statutoryEe, 2),
                    round((float) $tax, 2),
                    round((float) $statutoryEr, 2),
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
            return back()->with('error', 'For security, you cannot approve a request that you submitted yourself.');
        }

        $error = DB::transaction(function () use ($stockRequest, $actor) {
            /** @var \App\Models\User $lockedUser */
            $lockedUser = User::where('id', $this->sellerOwnerId())->lockForUpdate()->first();
            
            if (!$lockedUser) {
                return "Seller owner not found during fund release.";
            }

            $currentBalance = $this->ledgerService->buildFinancialSnapshot($lockedUser)['balance'];

            if ($currentBalance < (float) $stockRequest->total_cost) {
                return 'Insufficient funds. Cannot release PHP '.number_format((float) $stockRequest->total_cost, 2);
            }

            StockRequest::where('id', $stockRequest->id)->update(['status' => StockRequest::STATUS_ACCOUNTING_APPROVED]);
            $stockRequest->resolveActiveRevisions();

            OwnerApproval::query()
                ->where('seller_id', $lockedUser->id)
                ->where('domain', OwnerApproval::DOMAIN_PROCUREMENT)
                ->where('approvable_type', StockRequest::class)
                ->where('approvable_id', $stockRequest->id)
                ->where('status', OwnerApproval::STATUS_PENDING)
                ->update([
                    'status' => OwnerApproval::STATUS_APPROVED,
                    'reviewer_id' => $actor->id,
                    'reviewed_at' => now(),
                ]);

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
            return back()->with('error', 'Only pending stock requests can be declined.');
        }

        [$rawNote, $normalizedItems, $formattedReason] = $this->validateAndFormatRevision($request, 'stock_request');

        DB::transaction(function () use ($stockRequest, $formattedReason, $normalizedItems, $rawNote) {
            $stockRequest->update([
                'status' => StockRequest::STATUS_REJECTED,
                'rejection_reason' => $formattedReason,
            ]);

            $stockRequest->recordRevision('stock_request', $normalizedItems, $rawNote, $this->sellerActor()->id);

            OwnerApproval::query()
                ->where('seller_id', $this->sellerOwnerId())
                ->where('domain', OwnerApproval::DOMAIN_PROCUREMENT)
                ->where('approvable_type', StockRequest::class)
                ->where('approvable_id', $stockRequest->id)
                ->where('status', OwnerApproval::STATUS_PENDING)
                ->update([
                    'status' => OwnerApproval::STATUS_REJECTED,
                    'reviewer_id' => $this->sellerActor()->id,
                    'reviewed_at' => now(),
                    'rejection_reason' => $formattedReason,
                ]);
        });

        $stockRequest->loadMissing(['supply', 'requester', 'user']);

        if ($recipient = $this->resolveRequester($stockRequest)) {
            $supplyName = $stockRequest->supply?->name ?? 'the requested supply';

            $recipient->notify(new AccountingRejectedNotification(
                'Stock Request Declined',
                "Accounting declined stock request #{$stockRequest->id} for {$supplyName}. Reason: {$formattedReason}",
                route('stock-requests.index'),
                'stock_request',
                $stockRequest->id,
                $formattedReason
            ));
        }

        return back()->with('success', 'Fund release request declined.');
    }

    public function approvePayroll(Payroll $payroll)
    {
        Gate::authorize('approve', $payroll);

        if ($payroll->status !== 'Pending') {
            return back()->with('error', 'Payroll is not pending.');
        }

        $actor = $this->sellerActor();
        if ($payroll->requested_by_user_id && $payroll->requested_by_user_id === $actor->id) {
            return back()->with('error', 'For security, you cannot approve a request that you submitted yourself.');
        }

        $error = DB::transaction(function () use ($payroll, $actor) {
            /** @var \App\Models\User $lockedUser */
            $lockedUser = User::where('id', $this->sellerOwnerId())->lockForUpdate()->first();
            
            if (!$lockedUser) {
                return "Seller owner not found during payroll approval.";
            }

            $currentBalance = $this->ledgerService->buildFinancialSnapshot($lockedUser)['balance'];

            if ($currentBalance < (float) $payroll->total_amount) {
                return 'Insufficient funds. Cannot release payroll of PHP '.number_format((float) $payroll->total_amount, 2);
            }

            Payroll::where('id', $payroll->id)->update(['status' => 'Paid']);
            $payroll->resolveActiveRevisions();

            OwnerApproval::query()
                ->where('seller_id', $lockedUser->id)
                ->where('domain', OwnerApproval::DOMAIN_HR_PAYROLL)
                ->where('approvable_type', Payroll::class)
                ->where('approvable_id', $payroll->id)
                ->where('status', OwnerApproval::STATUS_PENDING)
                ->update([
                    'status' => OwnerApproval::STATUS_APPROVED,
                    'reviewer_id' => $actor->id,
                    'reviewed_at' => now(),
                ]);

            \Illuminate\Support\Facades\Cache::forget("seller_{$lockedUser->id}_pending_approvals_count");

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
            return back()->with('error', 'Only pending payroll requests can be declined.');
        }

        [$rawNote, $normalizedItems, $formattedReason] = $this->validateAndFormatRevision($request, 'payroll');

        DB::transaction(function () use ($payroll, $formattedReason, $normalizedItems, $rawNote) {
            $payroll->update([
                'status' => 'Rejected',
                'rejection_reason' => $formattedReason,
            ]);

            $payroll->recordRevision('payroll', $normalizedItems, $rawNote, $this->sellerActor()->id);

            OwnerApproval::query()
                ->where('seller_id', $this->sellerOwnerId())
                ->where('domain', OwnerApproval::DOMAIN_HR_PAYROLL)
                ->where('approvable_type', Payroll::class)
                ->where('approvable_id', $payroll->id)
                ->where('status', OwnerApproval::STATUS_PENDING)
                ->update([
                    'status' => OwnerApproval::STATUS_REJECTED,
                    'reviewer_id' => $this->sellerActor()->id,
                    'reviewed_at' => now(),
                    'rejection_reason' => $formattedReason,
                ]);
        });

        $payroll->loadMissing(['requester', 'user']);

        if ($recipient = $this->resolveRequester($payroll)) {
            $recipient->notify(new AccountingRejectedNotification(
                'Payroll Request Declined',
                "Accounting declined the payroll request for {$payroll->month}. Reason: {$formattedReason}",
                route('hr.index'),
                'payroll',
                $payroll->id,
                $formattedReason
            ));
        }

        return back()->with('success', 'Payroll request declined.');
    }

    /**
     * Validate revision checklist items and fallback reason for accounting rejections.
     *
     * @return array{0: string, 1: array, 2: string}
     */
    private function validateAndFormatRevision(Request $request, string $schemaKey): array
    {
        $validated = $request->validate([
            'reason' => ['nullable', 'string', 'max:1000'],
            'revision_items' => ['nullable', 'array', 'max:20'],
            'revision_items.*.key' => ['required_with:revision_items', 'string', 'max:80'],
            'revision_items.*.label' => ['nullable', 'string', 'max:120'],
            'revision_items.*.note' => ['nullable', 'string', 'max:500'],
        ]);

        $rawNote = strip_tags((string) ($validated['reason'] ?? ''));
        $rawItems = $validated['revision_items'] ?? [];
        if (empty($rawItems) && trim($rawNote) === '') {
            throw \Illuminate\Validation\ValidationException::withMessages([
                'reason' => ['Select at least one revision item or provide feedback.'],
            ]);
        }

        $normalized = RevisionSchemaRegistry::normalizeItems($schemaKey, $rawItems);
        $formatted = RevisionSchemaRegistry::formatSummaryString($normalized, $rawNote);

        return [$rawNote, $normalized, $formatted !== '' ? $formatted : $rawNote];
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
