<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;

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

                $effectivePrice = $liveProduct->effective_price;
                if ($item['price'] != $effectivePrice) {
                    $item['price'] = $effectivePrice;
                    $updatedCart = true;
                }

                $item['original_price'] = (float) $liveProduct->price;
                $item['discount_info'] = $liveProduct->discount_info;
                $item['has_discount'] = $liveProduct->has_discount;

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
        }

        if (request()->wantsJson() && !request()->header('X-Inertia')) {
            return response()->json(['cart' => $cart]);
        }

        return Inertia::render('Consumer/Shop/Cart', [
            'cart' => $cart,
        ]);
    }

    // 2. Add Item
    public function store(Request $request)
    {
        if (Auth::check() && in_array(Auth::user()->role, ['super_admin', 'admin'], true)) {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => 'Administrators are not permitted to make purchases.'], 403);
            }
            return redirect()->back()->with('error', 'Administrators are not permitted to make purchases.');
        }

        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'nullable|integer|min:1',
            'variant' => 'nullable|string|max:120',
        ]);

        $product = Product::select([
            'id', 'user_id', 'sku', 'name', 'slug', 'price', 'stock', 'cover_photo_path',
            'moq', 'supply_unit', 'wholesale_price', 'wholesale_min_qty', 'is_b2b_supply', 'weight'
        ])
            ->with('user:id,name,shop_name,city')
            ->findOrFail($validated['product_id']);
        $requestedQty = (int) ($validated['quantity'] ?? ($product->moq ?? 1));
        $variant = trim((string) ($validated['variant'] ?? 'Standard')) ?: 'Standard';
        $cartKey = $this->makeCartKey($product->id, $variant);

        $cart = $this->normalizeCart(Session::get('cart', []));

        if (isset($cart[$cartKey])) {
            $cart[$cartKey]['sku'] = $product->sku;
            $cart[$cartKey]['slug'] = $product->slug;
            if ($cart[$cartKey]['qty'] + $requestedQty > $product->stock) {
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json(['success' => false, 'message' => 'Not enough stock available.'], 422);
                }
                return redirect()->back()->with('error', 'Not enough stock available.');
            }
            $cart[$cartKey]['qty'] += $requestedQty;
        } else {
            if ($product->stock < $requestedQty) {
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json(['success' => false, 'message' => 'Product is out of stock.'], 422);
                }
                return redirect()->back()->with('error', 'Product is out of stock.');
            }
            $photo = $product->cover_photo_path ?: $product->img;
            $sellerName = $product->user->shop_name ?? $product->user->name ?? 'Shop';
            $cart[$cartKey] = [
                'id' => $product->id,
                'cart_key' => $cartKey,
                'artisan_id' => $product->user_id, // Seller ID for grouping
                'seller_id' => $product->user_id,
                'name' => $product->name,
                'variant' => $variant,
                'sku' => $product->sku,
                'slug' => $product->slug,
                'price' => $product->price,
                'qty' => $requestedQty,
                'img' => $photo,
                'image' => $photo,
                'cover_photo_path' => $photo,
                'seller' => $sellerName,
                'shop_name' => $sellerName,
                'seller_name' => $sellerName,
                'seller_city' => $product->user->city ?? 'Cavite',
                'location' => $product->user->city ?? 'Cavite',
                'moq' => $product->moq ?? 1,
                'supply_unit' => $product->supply_unit ?? 'pcs',
                'wholesale_price' => $product->wholesale_price,
                'wholesale_min_qty' => $product->wholesale_min_qty,
                'is_b2b_supply' => $product->is_b2b_supply,
                'weight' => $product->weight ?? 1.0,
            ];
        }

        Session::put('cart', $cart);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Added to cart!',
                'cart' => $cart,
                'cart_count' => collect($cart)->sum('qty'),
            ]);
        }

        return redirect()->back()->with('success', 'Added to cart!');
    }

    // 3. Update Quantity
    public function update(Request $request)
    {
        $id = $request->input('id') ?? $request->input('cart_key');
        $qty = (int) ($request->input('qty') ?? $request->input('quantity') ?? 1);

        if (!$id) {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => 'Cart item identifier is required.'], 422);
            }
            return redirect()->back()->with('error', 'Cart item identifier is required.');
        }

        $cart = $this->normalizeCart(Session::get('cart', []));
        
        if (isset($cart[$id])) {
            $product = Product::find($cart[$id]['id']);
            if ($product && $qty > $product->stock) {
                if ($request->wantsJson() || $request->ajax()) {
                    return response()->json(['success' => false, 'message' => 'Only ' . $product->stock . ' items available in stock.'], 422);
                }
                return redirect()->back()->with('error', 'Only ' . $product->stock . ' items available in stock.');
            }
            $cart[$id]['qty'] = max(1, $qty);
            Session::put('cart', $cart);
        }

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Cart updated.',
                'cart' => $cart,
                'cart_count' => collect($cart)->sum('qty'),
            ]);
        }

        return redirect()->back()->with('success', 'Cart updated.');
    }

    // 4. Remove Item
    public function destroy(Request $request)
    {
        $id = $request->input('id') ?? $request->input('cart_key');

        if (!$id) {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => 'Cart item identifier is required.'], 422);
            }
            return redirect()->back()->with('error', 'Cart item identifier is required.');
        }

        $cart = $this->normalizeCart(Session::get('cart', []));
        
        if (isset($cart[$id])) {
            unset($cart[$id]);
            Session::put('cart', $cart);
        }

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Item removed.',
                'cart' => $cart,
                'cart_count' => collect($cart)->sum('qty'),
            ]);
        }

        return redirect()->back()->with('success', 'Item removed.');
    }

    // 5. Clear Entire Cart
    public function clear(Request $request)
    {
        Session::forget('cart');

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => 'Cart cleared.',
                'cart' => [],
                'cart_count' => 0,
            ]);
        }

        return redirect()->back()->with('success', 'Cart cleared.');
    }

    public function buyAgain(int|string $orderId)
    {
        if (Auth::check() && in_array(Auth::user()->role, ['super_admin', 'admin'], true)) {
            return redirect()->back()->with('error', 'Administrators are not permitted to make purchases.');
        }

        $order = \App\Models\Order::with('items')->where('user_id', Auth::id())->findOrFail($orderId);
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
