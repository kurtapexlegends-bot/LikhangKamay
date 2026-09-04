<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Notifications\AccountingApprovalRequestedNotification;
use App\Models\StockRequest;
use App\Models\Supply;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Inertia\Inertia;

class StockRequestController extends Controller
{
    use InteractsWithSellerContext;

    /**
     * Display the Stock Request Dashboard
     */
    public function index()
    {
        Gate::authorize('viewAny', StockRequest::class);
        $userId = $this->sellerOwnerId();

        // Fetch requests with associated supply details
        $requests = StockRequest::with(['supply', 'requester:id,name'])
            ->where('user_id', $userId)
            ->latest()
            ->get();

        return Inertia::render('Seller/StockRequest/Index', [
            'requests' => $requests
        ]);
    }

    /**
     * Store a new stock request (triggered from Inventory)
     * This might be redundant if ProcurementController@requestRestock handles it,
     * but we can move it here for cleaner separation.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'supply_id' => 'required|exists:supplies,id',
            'quantity' => 'required|integer|min:1',
        ]);

        $supply = Supply::findOrFail($validated['supply_id']);
        
        // Phase 1: Authentication block
        $this->authorizeSellerOwnership($supply->user_id);
        Gate::authorize('create', StockRequest::class);

        // Phase 2: The Stopper (Max Stock Validation)
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
            'status' => StockRequest::STATUS_PENDING
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

        return redirect()->route('stock-requests.index')->with('success', 'Stock request created. Waiting for Accounting approval.');
    }

    /**
     * Mark request as Ordered (Purchase Made)
     */
    public function markAsOrdered(Request $request, StockRequest $stockRequest)
    {
        Gate::authorize('manage', $stockRequest);
        
        if ($stockRequest->status !== StockRequest::STATUS_ACCOUNTING_APPROVED) {
            return back()->with('error', 'Funds must be released first.');
        }

        $stockRequest->update(['status' => StockRequest::STATUS_ORDERED]);
        return back()->with('success', 'Request marked as ordered from supplier.');
    }

    /**
     * Receive items into Buffer (Inspection Stage)
     */
    public function receive(Request $request, StockRequest $stockRequest)
    {
        Gate::authorize('manage', $stockRequest);

        $validated = $request->validate(['quantity' => 'required|integer|min:1']);
        
        $remaining = $stockRequest->quantity - $stockRequest->received_quantity;
        if ($validated['quantity'] > $remaining) {
            return back()->with('error', "Cannot receive more than requested remaining ({$remaining}).");
        }

        // Add to buffer
        $stockRequest->received_quantity += $validated['quantity'];

        // Check for partial or full receipt
        if ($stockRequest->received_quantity < $stockRequest->quantity) {
             $stockRequest->status = StockRequest::STATUS_PARTIALLY_RECEIVED;
        } else {
             $stockRequest->status = StockRequest::STATUS_RECEIVED;
        }

        $stockRequest->save();

        return back()->with('success', "Received {$validated['quantity']} items. Ready for transfer to inventory.");
    }

    /**
     * Transfer items from Buffer to Active Inventory
     */
    public function transfer(Request $request, StockRequest $stockRequest)
    {
        Gate::authorize('manage', $stockRequest);

        $validated = $request->validate(['quantity' => 'required|integer|min:1']);
        
        try {
            DB::transaction(function () use ($stockRequest, $validated) {
                /** @var StockRequest $lockedStockRequest */
                $lockedStockRequest = StockRequest::where('id', $stockRequest->id)->lockForUpdate()->firstOrFail();

                // Check buffer availability
                $available = (int) $lockedStockRequest->received_quantity - (int) $lockedStockRequest->transferred_quantity;
                if ($validated['quantity'] > $available) {
                    throw new \DomainException("Cannot transfer more than available in buffer ({$available}).");
                }

                // 1. Update Inventory with lock
                if ($lockedStockRequest->supply_id) {
                    $supply = Supply::where('id', $lockedStockRequest->supply_id)->lockForUpdate()->first();
                    if ($supply) {
                        $supply->increment('quantity', $validated['quantity']);

                        // Sync to linked Product (Track as Supply)
                        if ($linkedProduct = $supply->product) {
                            $supply->refresh();
                            $linkedProduct->update(['stock' => $supply->quantity]);
                        }
                    }
                }

                // 2. Update Transfer Count
                $lockedStockRequest->transferred_quantity += $validated['quantity'];

                // 3. Check for completion (if we transferred up to the requested amount)
                if ($lockedStockRequest->transferred_quantity >= $lockedStockRequest->quantity) {
                    $lockedStockRequest->status = StockRequest::STATUS_COMPLETED;
                }
                
                $lockedStockRequest->save();
            });
        } catch (\DomainException $e) {
            return back()->with('error', $e->getMessage());
        }
        
        return back()->with('success', "Transferred {$validated['quantity']} items to active inventory.");
    }
}
