<?php

namespace App\Http\Controllers;

use App\Models\Supply;
use App\Models\StockRequest;
use App\Models\Order;
use App\Models\Payroll;
use App\Models\Employee;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Carbon\Carbon;

class ProcurementController extends Controller
{
    /**
     * Display inventory/supplies list
     */
    public function index()
    {
        $supplies = Supply::forUser(Auth::id())
            ->with('product') // Phase 1: Eager load product for images
            ->orderBy('category')
            ->orderBy('name')
            ->get();

        // Get counts for dashboard
        $totalItems = $supplies->count();
        $lowStockItems = $supplies->filter(fn(Supply $s) => $s->isLowStock())->count();
        $totalValue = $supplies->sum(fn($s) => $s->quantity * ($s->unit_cost ?? 0));
        
        // Get unique categories
        $categories = $supplies->pluck('category')->unique()->values();

        // Get Active Requests (Pending, Accounting Approved)
        $requests = StockRequest::with('supply')
            ->where('user_id', Auth::id())
            ->whereNotIn('status', [StockRequest::STATUS_COMPLETED, StockRequest::STATUS_REJECTED])
            ->latest()
            ->get();

        // --- FINANCIAL DATA AGGREGATION ---
        $userId = Auth::id();
        $currentMonth = Carbon::now()->format('F Y');

        // 1. Revenue
        $revenue = Order::where('artisan_id', $userId)
            ->where('status', 'Completed')
            ->sum('total_amount');

        // 2. Expenses (Payroll History)
        $expenses = Payroll::where('user_id', $userId)->where('status', 'Paid')->sum('total_amount');

        // 3. Pending Payroll
        $payrollExists = Payroll::where('user_id', $userId)
            ->where('month', $currentMonth)
            ->exists();

        $monthlyPayroll = Employee::where('user_id', $userId)
            ->where('status', 'Active')
            ->sum('salary');

        // 4. Transactions
        $recentPayrolls = Payroll::where('user_id', $userId)
            ->latest()
            ->take(10)
            ->get()
            ->map(function ($p) {
                return [
                    'id' => $p->id,
                    'description' => 'Staff Payroll - ' . $p->month,
                    'category' => 'Payroll',
                    'date' => $p->created_at->format('M d, Y'),
                    'amount' => $p->total_amount,
                    'type' => 'expense'
                ];
            });

        // 5. Stock Requests (Pending Accounting Approval)
        // Ensure we fetch requests that are SPECIFICALLY pending accounting approval or generally pending if that's the initial state
        $pendingRequests = StockRequest::with('supply')
            ->where('user_id', $userId)
            ->where('status', 'pending') 
            ->latest()
            ->get();

        // Add approved stock requests to total expenses
        $expenses += StockRequest::where('user_id', $userId)
            ->whereIn('status', [

                StockRequest::STATUS_ACCOUNTING_APPROVED,
                StockRequest::STATUS_ORDERED,
                StockRequest::STATUS_RECEIVED,
                StockRequest::STATUS_COMPLETED
            ])
            ->sum('total_cost');

        $finances = [
            'balance' => $revenue - $expenses,
            'revenue' => $revenue,
            'expenses' => $expenses,
            'net_income' => $revenue - $expenses,
            'payroll_due' => !$payrollExists ? $monthlyPayroll : 0,
            'is_paid' => $payrollExists,
            'month' => $currentMonth,
            'transactions' => $recentPayrolls,
            'requests' => $pendingRequests
        ];

        return Inertia::render('Seller/Procurement/Index', [
            'supplies' => $supplies,
            'requests' => $requests,
            'finances' => $finances, // Added
            'totalItems' => $totalItems,
            'lowStockItems' => $lowStockItems,
            'totalValue' => $totalValue,
            'categories' => $categories,
            'initTab' => request('tab', 'inventory'), // Support deep linking
        ]);
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

        Supply::create([
            'user_id' => Auth::id(),
            'max_stock' => $validated['max_stock'] ?? 500, // Phase 1: Default 500
            ...$validated,
        ]);

        return back()->with('success', 'Supply item added successfully!');
    }

    /**
     * Update supply item (for restocking)
     */
    public function update(Request $request, Supply $supply)
    {
        // Ensure belongs to current user
        if ($supply->user_id !== Auth::id()) {
            abort(403);
        }

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

        $supply->update($validated);

        return back()->with('success', 'Supply item updated!');
    }

    /**
     * Restock a supply item
     */
    public function restock(Request $request, Supply $supply)
    {
        if ($supply->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        $supply->increment('quantity', $validated['quantity']);

        // Sync to linked Product (Track as Supply)
        if ($supply->product_id && $supply->product) {
            $supply->product->update(['stock' => $supply->quantity]);
        }

        return back()->with('success', "Added {$validated['quantity']} {$supply->unit} to {$supply->name}!");
    }

    /**
     * Delete a supply item
     */
    public function destroy(Supply $supply)
    {
        if ($supply->user_id !== Auth::id()) {
            abort(403);
        }

        $supply->delete();

        return back()->with('success', 'Supply item removed.');
    }

    /**
     * Create a stock request for low inventory
     */
    public function requestRestock(Request $request, Supply $supply)
    {
        if ($supply->user_id !== Auth::id()) {
            abort(403);
        }

        $validated = $request->validate([
            'quantity' => 'required|integer|min:1',
        ]);

        // Phase 1: The Stopper (Max Stock Validation)
        $capacity = $supply->getAvailableCapacity();
        if ($validated['quantity'] > $capacity) {
            return back()->with('error', "Limit Exceeded: Max stock is {$supply->max_stock}. You can only request {$capacity} more items.");
        }

        $totalCost = $validated['quantity'] * ($supply->unit_cost ?? 0);

        StockRequest::create([
            'user_id' => Auth::id(),
            'supply_id' => $supply->id,
            'quantity' => $validated['quantity'],
            'total_cost' => $totalCost,
            'status' => 'pending'
        ]);

        return redirect()->route('stock-requests.index')->with('success', 'Restock request submitted to Accounting!');
    }

    /**
     * Complete the procurement cycle: Order Received
     */
    public function receiveOrder(Request $request, StockRequest $stockRequest)
    {
        if ($stockRequest->user_id !== Auth::id()) {
            abort(403);
        }

        if ($stockRequest->status !== StockRequest::STATUS_ACCOUNTING_APPROVED) {
            return back()->with('error', 'Funds must be released by Accounting before receiving order.');
        }

        // 1. Update Inventory
        $supply = $stockRequest->supply;
        if ($supply) {
            $supply->increment('quantity', $stockRequest->quantity);
        }

        // 2. Mark Request as Completed
        $stockRequest->update(['status' => StockRequest::STATUS_COMPLETED]);

        return back()->with('success', 'Items received and inventory updated!');
    }
    // --- FINANCE ACTIONS REMOVED (Deprecated) ---
}
