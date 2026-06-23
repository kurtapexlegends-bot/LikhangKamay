<?php

declare(strict_types=1);

namespace App\Http\Controllers\Seller;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Concerns\InteractsWithSellerContext;
use App\Models\Order;
use App\Models\User;
use App\Http\Requests\Seller\UpdateOrderStatusRequest;
use App\Http\Requests\Seller\ApproveReturnRequest;
use App\Http\Requests\Seller\UpdatePaymentStatusRequest;
use App\Actions\Seller\Orders\ListSellerOrders;
use App\Actions\Seller\Orders\ExportOrdersCsv;
use App\Actions\Seller\Orders\UpdateOrderStatus;
use App\Actions\Seller\Orders\ApproveOrderRefund;
use App\Actions\Seller\Orders\ApproveOrderReplacement;
use App\Actions\Seller\Orders\MarkOrderAsPaid;
use Illuminate\Http\Request;
use Inertia\Inertia;

class SellerOrderController extends Controller
{
    use InteractsWithSellerContext;

    /**
     * SELLER: View all orders for the logged-in artisan
     */
    public function index(Request $request, ListSellerOrders $listSellerOrders)
    {
        $sellerId = $this->sellerOwnerId();
        $seller = $this->sellerOwner();

        $result = $listSellerOrders->execute(
            $sellerId,
            $seller,
            $request->only(['search', 'start_date', 'end_date', 'status', 'quick_filter'])
        );

        return Inertia::render('Seller/Orders/OrderManager', [
            'orders' => $result['orders'],
            'tabCounts' => $result['tabCounts']
        ]);
    }

    /**
     * SELLER: Export orders to CSV
     */
    public function export(ExportOrdersCsv $exportOrdersCsv)
    {
        $sellerId = $this->sellerOwnerId();
        return $exportOrdersCsv->execute($sellerId);
    }

    /**
     * SELLER: Update order status (Accept, Ship, Deliver, Reject, etc.)
     */
    public function update(UpdateOrderStatusRequest $request, string $id, UpdateOrderStatus $updateOrderStatus)
    {
        $order = Order::where('order_number', $id)
            ->where('artisan_id', $this->sellerOwnerId())
            ->firstOrFail();

        $proofPath = null;
        if ($request->hasFile('proof_of_delivery')) {
            $proofPath = $request->file('proof_of_delivery')->store('proofs', 'public');
        }

        try {
            $updateOrderStatus->execute(
                $order,
                $request->only(['status', 'tracking_number', 'shipping_notes']),
                $request->user(),
                $proofPath
            );
            return redirect()->back()->with('success', 'Order status updated successfully.');
        } catch (\Exception $e) {
            return back()->with('error', $e->getMessage());
        }
    }

    /**
     * SELLER: Approve return request
     */
    public function approveReturn(
        ApproveReturnRequest $request,
        string $id,
        ApproveOrderRefund $approveOrderRefund,
        ApproveOrderReplacement $approveOrderReplacement
    ) {
        $order = Order::where('order_number', $id)
            ->where('artisan_id', $this->sellerOwnerId())
            ->where('status', 'Refund/Return')
            ->firstOrFail();

        if ($request->action_type === 'refund') {
            try {
                $approveOrderRefund->execute($order, $request->user());
                return back()->with('success', 'Return approved and marked as refunded.');
            } catch (\Throwable $e) {
                $message = $e->getMessage() === 'This return request is no longer pending.'
                    ? $e->getMessage()
                    : 'Refund could not be completed right now.';
                return back()->with('error', $message);
            }
        } else {
            try {
                $resolutionDescription = trim((string) $request->replacement_resolution_description);
                $message = $approveOrderReplacement->execute(
                    $order,
                    $resolutionDescription,
                    $request->user(),
                    $this->sellerOwner()
                );
                return back()->with('success', $message);
            } catch (\Exception $e) {
                return back()->with('error', $e->getMessage());
            }
        }
    }

    /**
     * SELLER: Update payment status (mark as paid/refunded)
     */
    public function updatePaymentStatus(UpdatePaymentStatusRequest $request, string $id, MarkOrderAsPaid $markOrderAsPaid)
    {
        try {
            $order = Order::where('order_number', $id)
                ->where('artisan_id', $this->sellerOwnerId())
                ->firstOrFail();

            $markOrderAsPaid->execute($order, $request->user());

            return redirect()->back()->with('success', 'Payment status updated.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', $e->getMessage());
        }
    }

    /**
     * SELLER: Download receipt for one of the seller's own orders
     */
    public function sellerDownloadReceipt(string $id)
    {
        $order = Order::with(['items' => function ($query) {
            $query->select('id', 'order_id', 'product_id', 'product_name', 'variant', 'quantity', 'price', 'product_img');
        }])
            ->where('order_number', $id)
            ->where('artisan_id', $this->sellerOwnerId())
            ->firstOrFail();

        return view('pdf.receipt', ['order' => $order]);
    }

    /**
     * SELLER: Bulk print labels
     */
    public function bulkLabels(Request $request)
    {
        $idsString = $request->query('ids', '');
        if (empty($idsString)) {
            return back()->with('error', 'No orders selected for printing.');
        }

        $ids = explode(',', $idsString);
        $sellerId = $this->sellerOwnerId();

        $orders = Order::where('artisan_id', $sellerId)
            ->whereIn('order_number', $ids)
            ->with(['items.product', 'user', 'delivery'])
            ->get();

        return Inertia::render('Seller/Orders/BulkLabels', [
            'orders' => $orders->map(function ($order) {
                return [
                    'id' => $order->order_number,
                    'customer' => $order->customer_name,
                    'address' => $order->shipping_address,
                    'phone' => $order->shipping_contact_phone,
                    'items' => $order->items->map(fn($i) => [
                        'name' => $i->product->name,
                        'qty' => $i->quantity,
                    ]),
                    'shipping_method' => $order->shipping_method,
                    'notes' => $order->shipping_notes,
                ];
            })
        ]);
    }
}
