<?php

namespace App\Actions\Consumer;

use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class CancelOrder
{
    /**
     * Cancel order before seller accepts it
     *
     * @param string $id
     * @param User $buyer
     * @return void
     */
    public function execute(string $id, User $buyer): void
    {
        DB::transaction(function () use ($id, $buyer) {
            $order = Order::lockForUpdate()->where('id', $id)
                ->where('user_id', $buyer->id)
                ->with('items')
                ->firstOrFail();

            if ($order->status !== 'Pending') {
                throw new \RuntimeException('Only pending orders can be cancelled.');
            }

            foreach ($order->items as $item) {
                $product = Product::lockForUpdate()->find($item->product_id);
                if ($product) {
                    $product->increment('stock', $item->quantity);
                    $product->refresh();
                    
                    if ($product->track_as_supply && $product->supply) {
                        $product->supply->update(['quantity' => $product->stock]);
                    }

                    if ($product->has_discount && $product->discount_info) {
                        $activeDiscountId = $product->discount_info['id'] ?? null;
                        $maxLimit = $product->discount_info['max_purchase_limit'] ?? null;
                        $promoCount = ($maxLimit !== null && $maxLimit > 0) ? min($item->quantity, $maxLimit) : $item->quantity;
                        if ($activeDiscountId && $promoCount > 0) {
                            \App\Models\Discount::where('id', $activeDiscountId)
                                ->where('promo_sold', '>=', $promoCount)
                                ->decrement('promo_sold', $promoCount);
                        }
                    }
                }
            }
            
            $order->update([
                'status' => 'Cancelled',
                'cancelled_at' => now(),
                'cancellation_reason' => 'buyer_cancelled',
            ]);

            if ($buyer->email) {
                \Illuminate\Support\Facades\Mail::to($buyer->email)->send(new \App\Mail\OrderCancelled($order, 'Cancelled by customer.'));
            }
        });
    }
}
