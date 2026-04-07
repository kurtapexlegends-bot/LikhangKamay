<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CartController extends Controller
{
    private function makeCartKey(int $productId, string $variant): string
    {
        $normalizedVariant = strtolower(trim($variant)) ?: 'standard';

        return $productId . ':' . md5($normalizedVariant);
    }

    /**
     * @param  array<string|int, mixed>  $cart
     * @return array<string, array<string, mixed>>
     */
    private function normalizeCart(array $cart): array
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

    // 1. Display Cart Page (This is what was missing!)
    public function index()
    {
        $cart = $this->normalizeCart(Session::get('cart', []));

        if (!empty($cart)) {
            $productIds = collect($cart)
                ->pluck('id')
                ->filter()
                ->unique()
                ->values()
                ->all();

            $liveProducts = Product::with('user:id,name,shop_name,city')
                ->whereIn('id', $productIds)
                ->get(['id', 'user_id', 'price', 'sku', 'slug'])
                ->keyBy('id');
            
            $updatedCart = false;
            foreach ($cart as &$item) {
                $liveProduct = $liveProducts->get($item['id']);

                if (!$liveProduct) {
                    continue;
                }

                if ($item['price'] != $liveProduct->price) {
                    $item['price'] = $liveProduct->price;
                    $updatedCart = true;
                }

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
            }
            
            if ($updatedCart) {
                Session::put('cart', $cart);
            }
        }

        return Inertia::render('Shop/Cart', [
            'cart' => $cart
        ]);
    }

    // 2. Add Item
    public function store(Request $request)
    {
        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'nullable|integer|min:1',
            'variant' => 'nullable|string|max:120',
        ]);

        $product = Product::with('user')->findOrFail($validated['product_id']);
        $requestedQty = (int) ($validated['quantity'] ?? 1);
        $variant = trim((string) ($validated['variant'] ?? 'Standard')) ?: 'Standard';
        $cartKey = $this->makeCartKey($product->id, $variant);

        $cart = $this->normalizeCart(Session::get('cart', []));

        if (isset($cart[$cartKey])) {
            $cart[$cartKey]['sku'] = $product->sku;
            $cart[$cartKey]['slug'] = $product->slug;
            if ($cart[$cartKey]['qty'] + $requestedQty > $product->stock) {
                return redirect()->back()->with('error', 'Not enough stock available.');
            }
            $cart[$cartKey]['qty'] += $requestedQty;
        } else {
            if ($product->stock < $requestedQty) {
                return redirect()->back()->with('error', 'Product is out of stock.');
            }
            $cart[$cartKey] = [
                'id' => $product->id,
                'cart_key' => $cartKey,
                'artisan_id' => $product->user_id, // Seller ID for grouping
                'name' => $product->name,
                'variant' => $variant,
                'sku' => $product->sku,
                'slug' => $product->slug,
                'price' => $product->price,
                'qty' => $requestedQty,
                'img' => $product->img,
                'seller' => $product->user->shop_name ?? $product->user->name ?? 'Shop',
                'shop_name' => $product->user->shop_name ?? $product->user->name ?? 'Shop',
                'location' => $product->user->city ?? 'Cavite'
            ];
        }

        Session::put('cart', $cart);

        return redirect()->back()->with('success', 'Added to cart!');
    }

    // 3. Update Quantity
    public function update(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|string',
            'qty' => 'required|integer|min:1',
        ]);

        $cart = $this->normalizeCart(Session::get('cart', []));
        
        if (isset($cart[$validated['id']])) {
            $product = Product::find($cart[$validated['id']]['id']);
            if ($product && $validated['qty'] > $product->stock) {
                return redirect()->back()->with('error', 'Only ' . $product->stock . ' items available.');
            }
            $cart[$validated['id']]['qty'] = $validated['qty'];
            Session::put('cart', $cart);
        }

        return redirect()->back();
    }

    // 4. Remove Item
    public function destroy(Request $request)
    {
        $validated = $request->validate([
            'id' => 'required|string',
        ]);

        $cart = $this->normalizeCart(Session::get('cart', []));
        
        if (isset($cart[$validated['id']])) {
            unset($cart[$validated['id']]);
            Session::put('cart', $cart);
        }

        return redirect()->back()->with('success', 'Item removed.');
    }

    public function buyAgain($orderId)
    {
        $order = \App\Models\Order::with('items')->where('user_id', Auth::id())->findOrFail($orderId);
        $cart = $this->normalizeCart(Session::get('cart', []));
        $addedCount = 0;
        $outOfStockCount = 0;

        foreach ($order->items as $item) {
            $product = Product::with('user')->find($item->product_id);
            
            if (!$product || $product->stock < 1) {
                $outOfStockCount++;
                continue;
            }

            $variant = trim((string) ($item->variant ?? 'Standard')) ?: 'Standard';
            $cartKey = $this->makeCartKey($product->id, $variant);

            // Add to cart logic (simplified from store method)
            if (isset($cart[$cartKey])) {
                // If already in cart, just ensure we don't exceed stock?
                // Or just add 1? Or add original qty?
                // Let's add 1 for now to be safe, or min(original_qty, stock).
                // Usually "Buy Again" adds 1 of each unless specified.
                // Let's add 1.
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
                    'qty' => 1, // Start with 1
                    'img' => $product->img, 
                    'seller' => $product->user->shop_name ?? $product->user->name ?? 'Shop',
                    'shop_name' => $product->user->shop_name ?? $product->user->name ?? 'Shop',
                    'location' => $product->user->city ?? 'Cavite'
                ];
                $addedCount++;
            }
        }

        Session::put('cart', $cart);

        if ($addedCount > 0) {
            if ($outOfStockCount > 0) {
                return redirect()->route('cart.index')->with('warning', "$addedCount items added to cart. $outOfStockCount items were out of stock.");
            }
            return redirect()->route('cart.index')->with('success', 'Items added to cart!');
        }

        return redirect()->back()->with('error', 'Unable to add items (Out of stock or unavailable).');
    }
}
