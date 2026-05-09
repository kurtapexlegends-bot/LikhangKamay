<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Services\OrderLogisticsService;
use Illuminate\Http\RedirectResponse;

class LalamoveDeliveryController extends Controller
{
    use InteractsWithSellerContext;

    public function store(string $id, OrderLogisticsService $orderLogisticsService): RedirectResponse
    {
        $order = Order::query()
            ->with(['delivery', 'user', 'artisan'])
            ->where('order_number', $id)
            ->where('artisan_id', $this->sellerOwnerId())
            ->firstOrFail();

        try {
            $delivery = $orderLogisticsService->bookLalamoveDelivery($order, $this->sellerOwner());
            $flowType = (string) (data_get($delivery->fresh()?->order_payload, 'metadata.flowType')
                ?: data_get($delivery->order_payload, 'metadata.flowType')
                ?: 'standard_delivery');

            return back()->with('success', $flowType === 'replacement_exchange'
                ? 'Replacement exchange courier created successfully.'
                : 'Lalamove delivery created successfully. Order is now in courier transit.');
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', $e->getMessage());
        }
    }

    public function bulkStore(\Illuminate\Http\Request $request, OrderLogisticsService $orderLogisticsService): RedirectResponse
    {
        $request->validate([
            'order_ids' => ['required', 'array', 'min:1'],
            'order_ids.*' => ['required', 'string'],
        ]);

        $orderIds = $request->input('order_ids');
        $artisanId = $this->sellerOwnerId();
        $artisan = $this->sellerOwner();

        $orders = Order::query()
            ->with(['delivery', 'user', 'artisan'])
            ->whereIn('order_number', $orderIds)
            ->where('artisan_id', $artisanId)
            ->get();

        $results = [
            'success' => 0,
            'failed' => 0,
            'errors' => [],
        ];

        foreach ($orders as $order) {
            try {
                $orderLogisticsService->bookLalamoveDelivery($order, $artisan);
                $results['success']++;
            } catch (\Throwable $e) {
                $results['failed']++;
                $results['errors'][] = "Order #{$order->order_number}: " . $e->getMessage();
            }
        }

        if ($results['failed'] > 0) {
            return back()->with('error', "Successfully booked {$results['success']} deliveries. Failed: {$results['failed']}. " . implode(' ', $results['errors']));
        }

        return back()->with('success', "Successfully booked all {$results['success']} deliveries.");
    }
}
