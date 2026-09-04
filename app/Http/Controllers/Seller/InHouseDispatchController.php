<?php

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Services\Logistics\InHouseDispatchService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class InHouseDispatchController extends Controller
{
    use InteractsWithSellerContext;

    /**
     * Get live availability of all studio drivers for the seller.
     */
    public function getDrivers(Request $request, InHouseDispatchService $dispatchService): JsonResponse
    {
        $seller = $this->sellerOwner();
        $isPremium = $seller->isPremiumTier();

        $drivers = $dispatchService->getDriversWithLiveAvailability($seller);

        return response()->json([
            'is_premium' => $isPremium,
            'tier_label' => $seller->getSellerTierLabel(),
            'drivers' => $drivers,
        ]);
    }

    /**
     * Dispatch an accepted order using in-house studio driver.
     */
    public function dispatch(string $id, Request $request, InHouseDispatchService $dispatchService): RedirectResponse
    {
        $request->validate([
            'employee_id' => ['required', 'integer'],
            'dispatch_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $order = Order::query()
            ->with(['delivery', 'user', 'artisan'])
            ->where(function ($q) use ($id) {
                $q->where('order_number', $id)->orWhere('id', $id);
            })
            ->where('artisan_id', $this->sellerOwnerId())
            ->firstOrFail();

        try {
            $dispatchService->dispatchOrderWithDriver(
                $order,
                (int) $request->input('employee_id'),
                $this->sellerOwner(),
                $request->input('dispatch_notes')
            );

            return back()->with('success', "Order #{$order->order_number} dispatched with studio driver.");
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * Bulk dispatch multiple accepted orders to an in-house studio driver.
     */
    public function bulkDispatch(Request $request, InHouseDispatchService $dispatchService): RedirectResponse
    {
        $request->validate([
            'order_ids' => ['required', 'array', 'min:1'],
            'order_ids.*' => ['required', 'string'],
            'employee_id' => ['required', 'integer'],
            'dispatch_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $orderIds = $request->input('order_ids');
        $employeeId = (int) $request->input('employee_id');
        $notes = $request->input('dispatch_notes');
        $seller = $this->sellerOwner();

        $orders = Order::query()
            ->with(['delivery', 'user', 'artisan'])
            ->whereIn('order_number', $orderIds)
            ->where('artisan_id', $seller->id)
            ->get();

        $successCount = 0;
        $failedCount = 0;
        $errors = [];

        foreach ($orders as $order) {
            try {
                $dispatchService->dispatchOrderWithDriver($order, $employeeId, $seller, $notes);
                $successCount++;
            } catch (\Throwable $e) {
                $failedCount++;
                $errors[] = "Order #{$order->order_number}: " . $e->getMessage();
            }
        }

        if ($failedCount > 0) {
            return back()->with('error', "Dispatched {$successCount} order(s). {$failedCount} failed: " . implode(' ', $errors));
        }

        return back()->with('success', "Successfully dispatched {$successCount} order(s) with studio driver.");
    }
}
