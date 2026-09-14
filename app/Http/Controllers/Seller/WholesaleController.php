<?php

declare(strict_types=1);

namespace App\Http\Controllers\Seller;

use App\Actions\Seller\Orders\UpdateOrderStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Seller\UpdateWholesaleOrderStatusRequest;
use App\Models\Order;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class WholesaleController extends Controller
{
    /**
     * Update status on a wholesale supply order.
     */
    public function updateStatus(
        UpdateWholesaleOrderStatusRequest $request,
        string $id,
        UpdateOrderStatus $updateOrderStatus
    ) {
        /** @var User|null $actor */
        $actor = $request->user()?->getEffectiveSeller() ?? $request->user() ?? Auth::user()?->getEffectiveSeller() ?? Auth::user();

        if (!$actor || !$actor->isArtisan()) {
            abort(403, 'Unauthorized.');
        }

        $order = Order::where(function ($q) use ($id) {
                $q->where('order_number', $id)->orWhere('id', $id);
            })
            ->where('artisan_id', $actor->id)
            ->firstOrFail();

        $proofPath = null;
        if ($request->hasFile('proof_of_delivery')) {
            $proofPath = $request->file('proof_of_delivery')->store('proofs', 'public');
        }

        try {
            $updateOrderStatus->execute(
                $order,
                $request->only(['status', 'tracking_number', 'shipping_notes']),
                $actor,
                $proofPath
            );
            return redirect()->back()->with('success', 'Wholesale order status updated successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }
}
