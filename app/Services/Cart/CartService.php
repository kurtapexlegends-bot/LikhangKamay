<?php

namespace App\Services\Cart;

use App\Models\Discount;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Session;

class CartService
{
    /**
     * Generate a unique cart item key based on product ID and variant.
     */
    public function makeCartKey(int $productId, string $variant): string
    {
        $normalizedVariant = strtolower(trim($variant)) ?: 'standard';

        return $productId . ':' . md5($normalizedVariant);
    }

    /**
     * Normalize cart array to guarantee consistent associative structure and integer keys.
     *
     * @param  array<string|int, mixed>  $cart
     * @return array<string, array<string, mixed>>
     */
    public function normalizeCart(array $cart): array
    {
        $normalized = [];

        foreach ($cart as $key => $item) {
            if (!is_array($item)) {
                continue;
            }

            $productId = (int) ($item['id'] ?? $key);
            if ($productId <= 0) {
                continue;
            }

            $variant = trim((string) ($item['variant'] ?? 'Standard')) ?: 'Standard';
            $cartKey = (string) ($item['cart_key'] ?? $this->makeCartKey($productId, $variant));
            $quantity = max(1, (int) ($item['qty'] ?? 1));

            $normalizedItem = [
                ...$item,
                'id' => $productId,
                'variant' => $variant,
                'cart_key' => $cartKey,
                'qty' => $quantity,
            ];

            if (isset($normalized[$cartKey])) {
                $normalized[$cartKey]['qty'] += $quantity;
                continue;
            }

            $normalized[$cartKey] = $normalizedItem;
        }

        return $normalized;
    }

    /**
     * Retrieve cart from session and synchronize with live product records.
     *
     * @return array<string, array<string, mixed>>
     */
    public function getCart(): array
    {
        $cart = $this->normalizeCart(Session::get('cart', []));

        if (!empty($cart)) {
            $cart = $this->syncCartWithDatabase($cart);
        }

        return $cart;
    }

    /**
     * Synchronize cart items with live database prices, stock, discounts, and seller info.
     *
     * @param  array<string, array<string, mixed>>  $cart
     * @return array<string, array<string, mixed>>
     */
    public function syncCartWithDatabase(array $cart): array
    {
        $productIds = collect($cart)
            ->pluck('id')
            ->filter()
            ->unique()
            ->values()
            ->all();

        if (empty($productIds)) {
            return $cart;
        }

        $liveProducts = Product::with(['user:id,name,shop_name,city', 'discounts'])
            ->whereIn('id', $productIds)
            ->get()
            ->keyBy('id');

        $updatedCart = false;

        foreach ($cart as &$item) {
            $liveProduct = $liveProducts->get($item['id']);

            if (!$liveProduct) {
                continue;
            }

            $effectivePrice = $liveProduct->is_b2b_supply
                ? $liveProduct->getEffectiveB2BPrice((int) ($item['qty'] ?? 1))
                : (float) $liveProduct->effective_price;

            if ((float) ($item['price'] ?? 0) != (float) $effectivePrice) {
                $item['price'] = $effectivePrice;
                $updatedCart = true;
            }

            $item['original_price'] = (float) $liveProduct->price;
            $item['discount_info'] = $liveProduct->discount_info;
            $item['has_discount'] = $liveProduct->has_discount;
            $item['is_b2b_supply'] = (bool) $liveProduct->is_b2b_supply;
            $item['moq'] = (int) ($liveProduct->moq ?: 1);
            $item['wholesale_price'] = $liveProduct->wholesale_price !== null ? (float) $liveProduct->wholesale_price : null;
            $item['wholesale_min_qty'] = $liveProduct->wholesale_min_qty ? (int) $liveProduct->wholesale_min_qty : null;
            $item['supply_unit'] = $liveProduct->supply_unit ?: 'pcs';

            if (($item['sku'] ?? null) !== $liveProduct->sku) {
                $item['sku'] = $liveProduct->sku;
                $updatedCart = true;
            }

            if (($item['slug'] ?? null) !== $liveProduct->slug) {
                $item['slug'] = $liveProduct->slug;
                $updatedCart = true;
            }

            $shopName = $liveProduct->user?->shop_name ?? $liveProduct->user?->name ?? 'Shop';
            $location = $liveProduct->user?->city ?? 'Cavite';

            if (($item['seller'] ?? null) !== $shopName) {
                $item['seller'] = $shopName;
                $updatedCart = true;
            }

            if (($item['shop_name'] ?? null) !== $shopName) {
                $item['shop_name'] = $shopName;
                $updatedCart = true;
            }

            if (($item['location'] ?? null) !== $location) {
                $item['location'] = $location;
                $updatedCart = true;
            }

            $photo = $liveProduct->cover_photo_path ?: $liveProduct->img;
            if (($item['image'] ?? null) !== $photo || ($item['cover_photo_path'] ?? null) !== $photo) {
                $item['image'] = $photo;
                $item['img'] = $photo;
                $item['cover_photo_path'] = $photo;
                $updatedCart = true;
            }
        }

        if ($updatedCart) {
            Session::put('cart', $cart);
        }

        return $cart;
    }

    /**
     * Add item to the shopping cart.
     *
     * @param array{product_id: int, quantity?: int|null, variant?: string|null} $data
     * @return array{success: bool, message: string, cart?: array, cart_count?: int, status: int}
     */
    public function addItem(array $data): array
    {
        $productColumns = [
            'id', 'user_id', 'sku', 'name', 'slug', 'price', 'stock', 'cover_photo_path',
            'moq', 'supply_unit', 'wholesale_price', 'wholesale_min_qty', 'weight'
        ];
        if (rescue(fn() => Schema::hasColumn('products', 'is_b2b_supply'), false)) {
            $productColumns[] = 'is_b2b_supply';
        }

        $product = Product::select($productColumns)
            ->with('user:id,name,shop_name,city')
            ->findOrFail($data['product_id']);

        $moq = (int) ($product->moq ?: 1);
        $requestedQty = (int) ($data['quantity'] ?? $moq);
        $variant = trim((string) ($data['variant'] ?? 'Standard')) ?: 'Standard';
        $cartKey = $this->makeCartKey($product->id, $variant);

        $cart = $this->normalizeCart(Session::get('cart', []));

        $currentQty = isset($cart[$cartKey]) ? (int) $cart[$cartKey]['qty'] : 0;
        $newTotalQty = $currentQty + $requestedQty;

        if ($product->is_b2b_supply && $newTotalQty < $moq) {
            $unit = $product->supply_unit ?: 'pcs';
            return [
                'success' => false,
                'message' => "Minimum order quantity for {$product->name} is {$moq} {$unit}.",
                'status' => 422,
            ];
        }

        if (isset($cart[$cartKey])) {
            $cart[$cartKey]['sku'] = $product->sku;
            $cart[$cartKey]['slug'] = $product->slug;
            if ($newTotalQty > $product->stock) {
                return [
                    'success' => false,
                    'message' => 'Not enough stock available.',
                    'status' => 422,
                ];
            }
            $cart[$cartKey]['qty'] = $newTotalQty;
            $cart[$cartKey]['price'] = $product->is_b2b_supply
                ? $product->getEffectiveB2BPrice($newTotalQty)
                : (float) $product->effective_price;
            $cart[$cartKey]['is_b2b_supply'] = (bool) $product->is_b2b_supply;
            $cart[$cartKey]['moq'] = $moq;
            $cart[$cartKey]['wholesale_price'] = $product->wholesale_price !== null ? (float) $product->wholesale_price : null;
            $cart[$cartKey]['wholesale_min_qty'] = $product->wholesale_min_qty ? (int) $product->wholesale_min_qty : null;
            $cart[$cartKey]['supply_unit'] = $product->supply_unit ?: 'pcs';
        } else {
            if ($product->stock < $requestedQty) {
                return [
                    'success' => false,
                    'message' => 'Product is out of stock.',
                    'status' => 422,
                ];
            }
            $photo = $product->cover_photo_path ?: $product->img;
            $sellerName = $product->user->shop_name ?? $product->user->name ?? 'Shop';
            $unitPrice = $product->is_b2b_supply
                ? $product->getEffectiveB2BPrice($requestedQty)
                : (float) $product->effective_price;

            $cart[$cartKey] = [
                'id' => $product->id,
                'cart_key' => $cartKey,
                'artisan_id' => $product->user_id,
                'seller_id' => $product->user_id,
                'name' => $product->name,
                'variant' => $variant,
                'sku' => $product->sku,
                'slug' => $product->slug,
                'price' => $unitPrice,
                'qty' => $requestedQty,
                'img' => $photo,
                'image' => $photo,
                'cover_photo_path' => $photo,
                'seller' => $sellerName,
                'shop_name' => $sellerName,
                'seller_name' => $sellerName,
                'seller_city' => $product->user->city ?? 'Cavite',
                'location' => $product->user->city ?? 'Cavite',
                'moq' => $moq,
                'supply_unit' => $product->supply_unit ?: 'pcs',
                'wholesale_price' => $product->wholesale_price !== null ? (float) $product->wholesale_price : null,
                'wholesale_min_qty' => $product->wholesale_min_qty ? (int) $product->wholesale_min_qty : null,
                'is_b2b_supply' => (bool) $product->is_b2b_supply,
                'weight' => (float) ($product->weight ?? 1.0),
            ];
        }

        Session::put('cart', $cart);

        return [
            'success' => true,
            'message' => 'Added to cart!',
            'cart' => $cart,
            'cart_count' => (int) collect($cart)->sum('qty'),
            'status' => 200,
        ];
    }

    /**
     * Update item quantity in the shopping cart.
     *
     * @return array{success: bool, message: string, cart?: array, cart_count?: int, status: int}
     */
    public function updateQuantity(string $cartKey, int $qty): array
    {
        $cart = $this->normalizeCart(Session::get('cart', []));

        if (!isset($cart[$cartKey])) {
            return [
                'success' => false,
                'message' => 'Cart item identifier is required.',
                'status' => 422,
            ];
        }

        $product = Product::find($cart[$cartKey]['id']);
        if ($product) {
            $moq = (int) ($product->moq ?: 1);
            if ($product->is_b2b_supply && $qty < $moq) {
                $unit = $product->supply_unit ?: 'pcs';
                return [
                    'success' => false,
                    'message' => "Minimum order quantity for {$product->name} is {$moq} {$unit}.",
                    'status' => 422,
                ];
            }

            if ($qty > $product->stock) {
                return [
                    'success' => false,
                    'message' => 'Only ' . $product->stock . ' items available in stock.',
                    'status' => 422,
                ];
            }

            $cart[$cartKey]['qty'] = max(1, $qty);
            $cart[$cartKey]['price'] = $product->is_b2b_supply
                ? $product->getEffectiveB2BPrice($cart[$cartKey]['qty'])
                : (float) $product->effective_price;
            $cart[$cartKey]['is_b2b_supply'] = (bool) $product->is_b2b_supply;
            $cart[$cartKey]['moq'] = $moq;
            $cart[$cartKey]['wholesale_price'] = $product->wholesale_price !== null ? (float) $product->wholesale_price : null;
            $cart[$cartKey]['wholesale_min_qty'] = $product->wholesale_min_qty ? (int) $product->wholesale_min_qty : null;
            $cart[$cartKey]['supply_unit'] = $product->supply_unit ?: 'pcs';
        } else {
            $cart[$cartKey]['qty'] = max(1, $qty);
        }

        Session::put('cart', $cart);

        return [
            'success' => true,
            'message' => 'Cart updated.',
            'cart' => $cart,
            'cart_count' => (int) collect($cart)->sum('qty'),
            'status' => 200,
        ];
    }

    /**
     * Remove an item from the cart.
     *
     * @return array{success: bool, message: string, cart: array, cart_count: int}
     */
    public function removeItem(string $cartKey): array
    {
        $cart = $this->normalizeCart(Session::get('cart', []));

        if (isset($cart[$cartKey])) {
            unset($cart[$cartKey]);
            Session::put('cart', $cart);
        }

        return [
            'success' => true,
            'message' => 'Item removed.',
            'cart' => $cart,
            'cart_count' => (int) collect($cart)->sum('qty'),
        ];
    }

    /**
     * Clear all items from the cart.
     *
     * @return array{success: bool, message: string, cart: array, cart_count: int}
     */
    public function clearCart(): array
    {
        Session::forget('cart');

        return [
            'success' => true,
            'message' => 'Cart cleared.',
            'cart' => [],
            'cart_count' => 0,
        ];
    }

    /**
     * Add items from a previous order back to cart.
     *
     * @return array{addedCount: int, outOfStockCount: int}
     */
    public function buyAgain(int|string $orderId, int $userId): array
    {
        $order = Order::with('items')->where('user_id', $userId)->findOrFail($orderId);
        $cart = $this->normalizeCart(Session::get('cart', []));
        $addedCount = 0;
        $outOfStockCount = 0;

        $productIds = $order->items()->pluck('product_id')->filter()->unique()->values()->all();
        $products = Product::with('user')->whereIn('id', $productIds)->get()->keyBy('id');

        foreach ($order->items as $item) {
            $product = $products->get($item->product_id);

            if (!$product || $product->stock < 1) {
                $outOfStockCount++;
                continue;
            }

            $variant = trim((string) ($item->variant ?? 'Standard')) ?: 'Standard';
            $cartKey = $this->makeCartKey($product->id, $variant);

            if (isset($cart[$cartKey])) {
                if ($cart[$cartKey]['qty'] + 1 <= $product->stock) {
                    $cart[$cartKey]['qty']++;
                    $addedCount++;
                } else {
                    $outOfStockCount++;
                }
            } else {
                $cart[$cartKey] = [
                    'id' => $product->id,
                    'cart_key' => $cartKey,
                    'artisan_id' => $product->user_id,
                    'name' => $product->name,
                    'variant' => $variant,
                    'sku' => $product->sku,
                    'slug' => $product->slug,
                    'price' => $product->price,
                    'qty' => 1,
                    'img' => $product->img,
                    'seller' => $product->user->shop_name ?? $product->user->name ?? 'Shop',
                    'shop_name' => $product->user->shop_name ?? $product->user->name ?? 'Shop',
                    'location' => $product->user->city ?? 'Cavite',
                ];
                $addedCount++;
            }
        }

        Session::put('cart', $cart);

        return [
            'addedCount' => $addedCount,
            'outOfStockCount' => $outOfStockCount,
        ];
    }

    /**
     * Restore multiple items into cart from client-side persistent backup.
     */
    public function restoreItems(array $items): int
    {
        $cart = $this->normalizeCart(Session::get('cart', []));
        $restoredCount = 0;

        $productIds = collect($items)->pluck('id')->filter()->unique()->values()->all();
        $products = Product::with('user:id,name,shop_name,city')
            ->whereIn('id', $productIds)
            ->get()
            ->keyBy('id');

        foreach ($items as $itemData) {
            $product = $products->get($itemData['id']);
            if (!$product || (int) $product->stock < 1) {
                continue;
            }

            $variant = trim((string) ($itemData['variant'] ?? 'Standard')) ?: 'Standard';
            $cartKey = $this->makeCartKey($product->id, $variant);
            $qty = min((int) $itemData['qty'], (int) $product->stock);

            $cart[$cartKey] = [
                'id' => $product->id,
                'cart_key' => $cartKey,
                'artisan_id' => $product->user_id,
                'name' => $product->name,
                'variant' => $variant,
                'sku' => $product->sku,
                'slug' => $product->slug,
                'price' => (float) $product->effective_price,
                'qty' => $qty,
                'img' => $product->cover_photo_path ?: $product->img,
                'seller' => $product->user?->shop_name ?? $product->user?->name ?? 'Shop',
                'shop_name' => $product->user?->shop_name ?? $product->user?->name ?? 'Shop',
                'location' => $product->user?->city ?? 'Cavite',
            ];
            $restoredCount++;
        }

        Session::put('cart', $cart);

        return $restoredCount;
    }

    /**
     * Validate coupon code eligibility against items in cart.
     *
     * @param array<string, array<string, mixed>> $cart
     * @return array{valid: bool, discount: float, message: string, coupon?: Discount}
     */
    public function validateCoupon(string $couponCode, array $cart): array
    {
        $cleanedCode = strtoupper(trim($couponCode));
        if (empty($cleanedCode)) {
            return [
                'valid' => false,
                'discount' => 0.0,
                'message' => 'Coupon code is required.',
            ];
        }

        $coupon = Discount::where('code', $cleanedCode)
            ->where('is_active', true)
            ->where(function ($q) {
                $q->whereNull('start_at')->orWhere('start_at', '<=', now());
            })
            ->where(function ($q) {
                $q->whereNull('end_at')->orWhere('end_at', '>=', now());
            })
            ->first();

        if (!$coupon) {
            return [
                'valid' => false,
                'discount' => 0.0,
                'message' => 'Invalid or expired coupon code.',
            ];
        }

        $subtotal = collect($cart)->sum(fn($item) => (float) ($item['price'] ?? 0) * (int) ($item['qty'] ?? 1));

        if ($coupon->min_spend && $subtotal < (float) $coupon->min_spend) {
            return [
                'valid' => false,
                'discount' => 0.0,
                'message' => "Minimum spend of ₱{$coupon->min_spend} required for this coupon.",
            ];
        }

        $discountAmount = $coupon->type === 'percentage'
            ? ($subtotal * ((float) $coupon->value / 100))
            : (float) $coupon->value;

        if ($coupon->max_discount && $discountAmount > (float) $coupon->max_discount) {
            $discountAmount = (float) $coupon->max_discount;
        }

        $discountAmount = min($discountAmount, $subtotal);

        return [
            'valid' => true,
            'discount' => round($discountAmount, 2),
            'message' => 'Coupon applied successfully.',
            'coupon' => $coupon,
        ];
    }

    /**
     * Compute totals for given cart and optional coupon.
     *
     * @param array<string, array<string, mixed>> $cart
     * @return array{subtotal: float, discount: float, total: float, total_qty: int}
     */
    public function calculateCartTotals(array $cart, ?string $couponCode = null): array
    {
        $subtotal = (float) collect($cart)->sum(fn($item) => (float) ($item['price'] ?? 0) * (int) ($item['qty'] ?? 1));
        $totalQty = (int) collect($cart)->sum(fn($item) => (int) ($item['qty'] ?? 1));
        $discountAmount = 0.0;

        if ($couponCode) {
            $couponResult = $this->validateCoupon($couponCode, $cart);
            if ($couponResult['valid']) {
                $discountAmount = (float) $couponResult['discount'];
            }
        }

        $total = max(0.0, $subtotal - $discountAmount);

        return [
            'subtotal' => round($subtotal, 2),
            'discount' => round($discountAmount, 2),
            'total' => round($total, 2),
            'total_qty' => $totalQty,
        ];
    }
}
