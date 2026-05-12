<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Notifications\AccountingApprovalRequestedNotification;
use App\Models\Supply;
use App\Models\StockRequest;
use App\Models\Order;
use App\Models\Payroll;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class ProcurementController extends Controller
{
    use InteractsWithSellerContext;

    /**
     * Display inventory/supplies list
     */
    public function index()
    {
        $actor = $this->sellerActor();
        $sellerId = $this->sellerOwnerId();

        $supplies = Supply::forUser($sellerId)
            ->with('product')
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        $categories = $supplies->pluck('category')->unique()->values();

        $requests = StockRequest::with('supply')
            ->where('user_id', $sellerId)
            ->whereNotIn('status', [StockRequest::STATUS_COMPLETED, StockRequest::STATUS_REJECTED])
            ->latest()
            ->get();

        $finances = $this->getProcurementFinances($sellerId, $actor);

        return Inertia::render('Seller/Procurement/Index', [
            'supplies' => $supplies,
            'requests' => $requests,
            'finances' => $finances,
            'totalItems' => $supplies->count(),
            'lowStockItems' => $supplies->filter(fn(Supply $s) => $s->isLowStock())->count(),
            'totalValue' => $supplies->sum(fn($s) => $s->quantity * ($s->unit_cost ?? 0)),
            'categories' => $categories,
            'initTab' => request('tab', 'inventory'),
        ]);
    }

    private function getProcurementFinances(int $sellerId, $actor): array
    {
        $currentMonth = Carbon::now()->format('F Y');
        $canViewPayrollData = $actor->canViewSellerPayrollData();

        $revenue = Order::where('artisan_id', $sellerId)
            ->where('status', 'Completed')
            ->sum('total_amount');

        $payrollExpenses = $canViewPayrollData
            ? Payroll::where('user_id', $sellerId)->where('status', 'Paid')->sum('total_amount')
            : 0;

        $payrollExists = $canViewPayrollData
            ? Payroll::where('user_id', $sellerId)
                ->where('month', $currentMonth)
                ->exists()
            : false;

        $monthlyPayroll = $canViewPayrollData
            ? Employee::where('user_id', $sellerId)
                ->where('status', 'Active')
                ->sum('salary')
            : 0;

        $recentPayrolls = $canViewPayrollData
            ? Payroll::where('user_id', $sellerId)
                ->latest()
                ->take(10)
                ->get()
                ->map(fn ($p) => [
                    'id' => $p->id,
                    'description' => 'Staff Payroll - ' . $p->month,
                    'category' => 'Payroll',
                    'date' => $p->created_at->format('M d, Y'),
                    'amount' => $p->total_amount,
                    'type' => 'expense'
                ])
            : collect();

        $pendingRequests = StockRequest::with('supply')
            ->where('user_id', $sellerId)
            ->where('status', 'pending') 
            ->latest()
            ->get();

        $stockExpenses = StockRequest::where('user_id', $sellerId)
            ->whereIn('status', [
                StockRequest::STATUS_ACCOUNTING_APPROVED,
                StockRequest::STATUS_ORDERED,
                StockRequest::STATUS_RECEIVED,
                StockRequest::STATUS_COMPLETED
            ])
            ->sum('total_cost');

        $expenses = $stockExpenses + $payrollExpenses;

        return [
            'balance' => $revenue - $expenses,
            'revenue' => $revenue,
            'expenses' => $expenses,
            'net_income' => $revenue - $expenses,
            'payroll_due' => $canViewPayrollData && !$payrollExists ? $monthlyPayroll : null,
            'is_paid' => $payrollExists,
            'month' => $currentMonth,
            'transactions' => $recentPayrolls->values()->all(),
            'requests' => $pendingRequests
        ];
    }

    /**
     * Store a new supply item
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'category' => 'required|string|in:Finished Goods,Tools,Packaging,Glazes,Other', // Phase 1: Standardized
            'quantity' => 'required|integer|min:0',
            'unit' => 'required|string|max:20',
            'min_stock' => 'required|integer|min:0',
            'max_stock' => 'nullable|integer|gt:min_stock', // Phase 1: Added max_stock
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        Supply::create(Supply::filterSchemaCompatibleAttributes([
            'user_id' => $this->sellerOwnerId(),
            'max_stock' => $validated['max_stock'] ?? 500, // Phase 1: Default 500
            ...$validated,
        ]));

        return back()->with('success', 'Supply item added successfully!');
    }

    /**
     * Update supply item (for restocking)
     */
    public function update(Request $request, Supply $supply)
    {
        // Ensure belongs to current user
        $this->authorizeSellerOwnership($supply->user_id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'category' => 'sometimes|string|in:Finished Goods,Tools,Packaging,Glazes,Other',
            'quantity' => 'sometimes|integer|min:0',
            'unit' => 'sometimes|string|max:20',
            'min_stock' => 'sometimes|integer|min:0',
            'max_stock' => 'nullable|integer|gt:min_stock', // Phase 1
            'unit_cost' => 'nullable|numeric|min:0',
            'supplier' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        DB::transaction(function () use ($supply, $validated) {
            /** @var \App\Models\Supply $lockedSupply */
            $lockedSupply = Supply::where('id', $supply->id)->lockForUpdate()->first();
            $lockedSupply->update(Supply::filterSchemaCompatibleAttributes($validated));

            // Sync to linked Product (Track as Supply)
            if ($linkedProduct = $lockedSupply->product) {
                /** @var \App\Models\Product $lockedProduct */
                $lockedProduct = \App\Models\Product::where('id', $linkedProduct->id)->lockForUpdate()->first();
                if ($lockedProduct) {
                    $lockedProduct->update(['stock' => $lockedSupply->quantity]);
                }
            }
        });

        return back()->with('success', 'Supply item updated!');
    }

    /**
     * Restock a supply item
     */
    public function restock(Request $request, Supply $supply)
    {
        $this->authorizeSellerOwnership($supply->user_id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        DB::transaction(function () use ($supply, $validated) {
            /** @var \App\Models\Supply $lockedSupply */
            $lockedSupply = Supply::where('id', $supply->id)->lockForUpdate()->first();
            $lockedSupply->increment('quantity', $validated['quantity']);

            // Sync to linked Product (Track as Supply)
            if ($linkedProduct = $lockedSupply->product) {
                /** @var \App\Models\Product $lockedProduct */
                $lockedProduct = \App\Models\Product::where('id', $linkedProduct->id)->lockForUpdate()->first();
                if ($lockedProduct) {
                    $lockedProduct->update(['stock' => $lockedSupply->quantity]);
                }
            }
        });

        return back()->with('success', "Added {$validated['quantity']} {$supply->unit} to {$supply->name}!");
    }

    /**
     * Delete a supply item
     */
    public function destroy(Supply $supply)
    {
        $this->authorizeSellerOwnership($supply->user_id);

        $supply->delete();

        return back()->with('success', 'Supply item removed.');
    }

    /**
     * Create a stock request for low inventory
     */
    public function requestRestock(Request $request, Supply $supply)
    {
        $this->authorizeSellerOwnership($supply->user_id);

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        // Phase 1: The Stopper (Max Stock Validation)
        $capacity = $supply->getAvailableCapacity();
        if ($validated['quantity'] > $capacity) {
            return back()->with('error', "Limit Exceeded: Max stock is {$supply->max_stock}. You can only request {$capacity} more items.");
        }

        $totalCost = $validated['quantity'] * ($supply->unit_cost ?? 0);

        $stockRequest = StockRequest::create(StockRequest::filterSchemaCompatibleAttributes([
            'user_id' => $this->sellerOwnerId(),
            'requested_by_user_id' => $this->sellerActor()->id,
            'supply_id' => $supply->id,
            'quantity' => $validated['quantity'],
            'total_cost' => $totalCost,
            'status' => 'pending'
        ]));

        $requesterName = $this->sellerActor()->name ?: 'A staff member';
        $message = "{$requesterName} submitted a stock request for {$supply->name} for accounting approval.";

        $this->accountingRecipientsForSeller()->each(function ($recipient) use ($stockRequest, $message) {
            $recipient->notify(new AccountingApprovalRequestedNotification(
                'New Stock Request',
                $message,
                route('accounting.index'),
                'stock_request',
                $stockRequest->id,
            ));
        });

        return redirect()->route('stock-requests.index')->with('success', 'Restock request submitted to Accounting!');
    }

    /**
     * Complete the procurement cycle: Order Received
     */
    public function receiveOrder(Request $request, StockRequest $stockRequest)
    {
        $this->authorizeSellerOwnership($stockRequest->user_id);

        if ($stockRequest->status !== StockRequest::STATUS_ACCOUNTING_APPROVED) {
            return back()->with('error', 'Funds must be released by Accounting before receiving order.');
        }

        DB::transaction(function () use ($stockRequest) {
            /** @var \App\Models\StockRequest $lockedRequest */
            $lockedRequest = StockRequest::where('id', $stockRequest->id)->lockForUpdate()->first();

            // 1. Update Inventory
            $supply = $lockedRequest->supply;
            if ($supply) {
                /** @var \App\Models\Supply $lockedSupply */
                $lockedSupply = Supply::where('id', $supply->id)->lockForUpdate()->first();
                $lockedSupply->increment('quantity', $lockedRequest->quantity);

                // Sync to linked Product (Track as Supply)
                if ($linkedProduct = $lockedSupply->product) {
                    /** @var \App\Models\Product $lockedProduct */
                    $lockedProduct = \App\Models\Product::where('id', $linkedProduct->id)->lockForUpdate()->first();
                    if ($lockedProduct) {
                        $lockedProduct->update(['stock' => $lockedSupply->quantity]);
                    }
                }
            }

            // 2. Mark Request as Completed
            $lockedRequest->update(['status' => StockRequest::STATUS_COMPLETED]);
        });

        return back()->with('success', 'Items received and inventory updated!');
    }
    // --- FINANCE ACTIONS REMOVED (Deprecated) ---
}
