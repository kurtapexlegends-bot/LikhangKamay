<?php

namespace App\Http\Controllers;

use App\Models\StockRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class AccountingController extends Controller
{
    public function index()
    {
        $userId = Auth::id();

        // 1. Calculate Total Revenue (Completed Orders)
        // We only count revenue that is actually "paid" or "completed" to be safe, 
        // but for now let's use all 'completed' orders as the realized revenue source.
        $totalRevenue = \App\Models\Order::where('artisan_id', $userId)
            ->where('status', 'completed')
            ->sum('total_amount');

        // 2. Calculate Total Expenses (Released Stock Requests + Paid Payrolls)
        
        // A. Stock Requests (Released Funds)
        // Status: accounting_approved, ordered, partially_received, received, completed
        $stockExpenses = StockRequest::where('user_id', $userId)
            ->whereIn('status', [
                StockRequest::STATUS_ACCOUNTING_APPROVED, 
                StockRequest::STATUS_ORDERED, 
                StockRequest::STATUS_PARTIALLY_RECEIVED, 
                StockRequest::STATUS_RECEIVED, 
                StockRequest::STATUS_COMPLETED
            ])
            ->sum('total_cost');

        // B. Payroll (Paid)
        $payrollExpenses = \App\Models\Payroll::where('user_id', $userId)->where('status', 'Paid')->sum('total_amount');

        $totalExpenses = $stockExpenses + $payrollExpenses;
        $baseFunds = Auth::user()->base_funds ?? 0;
        $currentBalance = $baseFunds + $totalRevenue - $totalExpenses;

        // Get requests that are pending approval
        // These are waiting for Accounting to release funds.
        $pendingRelease = StockRequest::with('supply')
            ->where('user_id', $userId)
            ->where('status', StockRequest::STATUS_PENDING)
            ->latest()
            ->get();

        $pendingPayrolls = \App\Models\Payroll::where('user_id', $userId)
            ->where('status', 'Pending')
            ->latest()
            ->get();

        // Also show recently released funds for history
        $releasedHistory = StockRequest::with('supply')
            ->where('user_id', $userId)
            ->whereIn('status', [
                StockRequest::STATUS_ACCOUNTING_APPROVED, 
                StockRequest::STATUS_ORDERED, 
                StockRequest::STATUS_PARTIALLY_RECEIVED, 
                StockRequest::STATUS_RECEIVED, 
                StockRequest::STATUS_COMPLETED,
                StockRequest::STATUS_REJECTED // Include rejected for history
            ])
            ->latest()
            ->take(10)
            ->get();

        $payrollHistory = \App\Models\Payroll::where('user_id', $userId)
            ->whereIn('status', ['Paid', 'Rejected'])
            ->latest()
            ->take(10)
            ->get();

        return Inertia::render('Seller/Accounting/FundRelease', [
            'pendingRequests' => $pendingRelease,
            'pendingPayrolls' => $pendingPayrolls,
            'history' => $releasedHistory,
            'payrollHistory' => $payrollHistory,
            'finances' => [
                'baseFunds' => $baseFunds,
                'revenue' => $totalRevenue,
                'expenses' => $totalExpenses,
                'balance' => $currentBalance
            ]
        ]);
    }

    public function approveRelease(StockRequest $stockRequest)
    {
        if ($stockRequest->user_id !== Auth::id()) {
            abort(403);
        }

        if ($stockRequest->status !== StockRequest::STATUS_PENDING) {
            return back()->with('error', 'Request is not pending.');
        }

        // --- BUDGET CHECK ---
        $userId = Auth::id();
        $totalRevenue = \App\Models\Order::where('artisan_id', $userId)->where('status', 'completed')->sum('total_amount');
        
        $stockExpenses = StockRequest::where('user_id', $userId)
            ->whereIn('status', [
                StockRequest::STATUS_ACCOUNTING_APPROVED, 
                StockRequest::STATUS_ORDERED, 
                StockRequest::STATUS_PARTIALLY_RECEIVED, 
                StockRequest::STATUS_RECEIVED, 
                StockRequest::STATUS_COMPLETED
            ])
            ->sum('total_cost');
            
        $payrollExpenses = \App\Models\Payroll::where('user_id', $userId)->where('status', 'Paid')->sum('total_amount');
            
        $user = Auth::user();
        $baseFunds = $user->base_funds ?? 0;
        $currentBalance = $baseFunds + $totalRevenue - ($stockExpenses + $payrollExpenses);

        if ($currentBalance < $stockRequest->total_cost) {
            return back()->with('error', 'Insufficient funds. Cannot release ₱' . number_format($stockRequest->total_cost, 2));
        }

        // Logic: Release funds. 
        $stockRequest->update(['status' => StockRequest::STATUS_ACCOUNTING_APPROVED]);

        return back()->with('success', 'Funds released. Procurement can now proceed.');
    }

    public function rejectRelease(Request $request, StockRequest $stockRequest)
    {
        if ($stockRequest->user_id !== Auth::id()) {
            abort(403);
        }

        // Validate reason
        $request->validate([
            'reason' => 'required|string|max:255'
        ]);

        $stockRequest->update([
            'status' => StockRequest::STATUS_REJECTED,
            'rejection_reason' => $request->reason,
        ]);

        $user = \App\Models\User::find($stockRequest->user_id);
        if ($user) {
            $user->notify(new \App\Notifications\AccountingRejectedNotification(
                'Stock Request Rejected',
                "Accounting rejected your stock request for {$stockRequest->supply->name}. Reason: {$request->reason}",
                route('stock-requests.index') // Route where procurement manages requests
            ));
        }

        return back()->with('success', 'Fund release rejected.');
    }

    public function approvePayroll(\App\Models\Payroll $payroll)
    {
        if ($payroll->user_id !== Auth::id()) {
            abort(403);
        }

        // BUDGET CHECK
        $userId = Auth::id();
        $totalRevenue = \App\Models\Order::where('artisan_id', $userId)->where('status', 'completed')->sum('total_amount');
        
        $stockExpenses = StockRequest::where('user_id', $userId)
            ->whereIn('status', [
                StockRequest::STATUS_ACCOUNTING_APPROVED, 
                StockRequest::STATUS_ORDERED, 
                StockRequest::STATUS_PARTIALLY_RECEIVED, 
                StockRequest::STATUS_RECEIVED, 
                StockRequest::STATUS_COMPLETED
            ])
            ->sum('total_cost');

        $payrollExpenses = \App\Models\Payroll::where('user_id', $userId)->where('status', 'Paid')->sum('total_amount');

        $user = Auth::user();
        $baseFunds = $user->base_funds ?? 0;
            
        $currentBalance = $baseFunds + $totalRevenue - ($stockExpenses + $payrollExpenses);

        if ($currentBalance < $payroll->total_amount) {
            return back()->with('error', 'Insufficient funds. Cannot release payroll of ₱' . number_format($payroll->total_amount, 2));
        }

        $payroll->update(['status' => 'Paid']);

        return back()->with('success', 'Payroll approved and funds released.');
    }

    public function rejectPayroll(Request $request, \App\Models\Payroll $payroll)
    {
         if ($payroll->user_id !== Auth::id()) {
            abort(403);
        }

        $request->validate([
            'reason' => 'required|string|max:255'
        ]);

        $payroll->update([
            'status' => 'Rejected',
            'rejection_reason' => $request->reason
        ]);

        $user = \App\Models\User::find($payroll->user_id);
        if ($user) {
            $user->notify(new \App\Notifications\AccountingRejectedNotification(
                'Payroll Request Rejected',
                "Accounting rejected the Payroll for {$payroll->month}. Reason: {$request->reason}",
                route('hr.index') // Route where HR manages payroll requests
            ));
        }

        return back()->with('success', 'Payroll rejected.');
    }

    public function updateBaseFunds(Request $request) 
    {
        $request->validate([
            'base_funds' => 'required|numeric|min:0'
        ]);

        $user = Auth::user();
        \App\Models\User::where('id', $user->id)->update([
            'base_funds' => $request->base_funds
        ]);

        return back()->with('success', 'Starting balance updated successfully.');
    }
}
