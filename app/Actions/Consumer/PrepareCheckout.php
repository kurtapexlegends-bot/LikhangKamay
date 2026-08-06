<?php

namespace App\Actions\Consumer;

use App\Models\Product;
use App\Services\StorageUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;

class PrepareCheckout
{
    /**
     * Prepare items for checkout
     *
     * @param Request $request
     * @return array
     */
    public function execute(Request $request): array
    {
        $items = [];

        // CASE 1: Buy Now (Single Product)
        if ($request->has('product_id')) {
            $product = Product::with(['user', 'discounts'])->find($request->product_id);
            $variant = trim((string) $request->input('variant', 'Standard')) ?: 'Standard';

            if ($product) {
                $items[] = [
                    'id' => $product->id,
                    'cart_key' => null,
                    'artisan_id' => $product->artisan_id ?? $product->user_id,
                    'shop_name' => $product->user->shop_name ?? 'Shop',
                    'name' => $product->name,
                    'variant' => $variant,
                    'price' => $product->effective_price,
                    'original_price' => (float) $product->price,
                    'discount_info' => $product->discount_info,
                    'qty' => $request->input('quantity', 1),
                    'img' => $product->img
                ];
            }
        }
        // CASE 2: Checkout from Cart
        else {
            $cart = Session::get('cart', []);
            $selectedIds = collect($request->input('items', []))
                ->map(fn ($item) => (string) $item)
                ->values()
                ->all();

            if (!empty($selectedIds) && is_array($selectedIds)) {
                $items = array_filter(
                    $cart,
                    function ($item, $cartKey) use ($selectedIds) {
                        return in_array((string) $cartKey, $selectedIds, true)
                            || in_array((string) ($item['id'] ?? ''), $selectedIds, true);
                    },
                    ARRAY_FILTER_USE_BOTH
                );
            } else {
                $items = $cart;
            }

            // Sync with live database effective prices
            $productIds = collect($items)->pluck('id')->filter()->unique()->all();
            $liveProducts = Product::with(['user', 'discounts'])->whereIn('id', $productIds)->get()->keyBy('id');

            foreach ($items as &$item) {
                $live = $liveProducts->get($item['id']);
                if ($live) {
                    $item['price'] = $live->effective_price;
                    $item['original_price'] = (float) $live->price;
                    $item['discount_info'] = $live->discount_info;
                    $item['artisan_id'] = $live->artisan_id ?? $live->user_id;
                    $item['shop_name'] = $live->user->shop_name ?? 'Shop';
                }
            }

            $items = array_values(array_map(function ($item, $cartKey) {
                if (!isset($item['cart_key'])) {
                    $item['cart_key'] = (string) $cartKey;
                }

                if (!isset($item['variant']) || trim((string) $item['variant']) === '') {
                    $item['variant'] = 'Standard';
                }

                return $item;
            }, $items, array_keys($items)));

            foreach ($items as &$item) {
                $item['img'] = StorageUrl::url($item['img'] ?? null, '/images/placeholder.svg');
            }
        }

        return $items;
    }
}
