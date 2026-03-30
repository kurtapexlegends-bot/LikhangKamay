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

            return back()->with('success', 'Lalamove delivery created successfully. Order is now in courier transit.');
        } catch (\Throwable $e) {
            report($e);

            return back()->with('error', $e->getMessage());
        }
    }
}
