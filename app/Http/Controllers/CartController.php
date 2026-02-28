<?php

namespace App\Http\Controllers;

use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class CartController extends Controller
{
    // 1. Display Cart Page (This is what was missing!)
    public function index()
    {
        $cart = Session::get('cart', []);
        return Inertia::render('Shop/Cart', [
            'cart' => $cart
        ]);
    }

    // 2. Add Item
    public function store(Request $request)
    {
        $product = Product::with('user')->find($request->product_id);

        if (!$product) {
            return redirect()->back()->with('error', 'Product not found.');
        }

        $cart = Session::get('cart', []);

        if (isset($cart[$product->id])) {
            if ($cart[$product->id]['qty'] + 1 > $product->stock) {
                return redirect()->back()->with('error', 'Not enough stock available.');
            }
            $cart[$product->id]['qty']++;
        } else {
            if ($product->stock < 1) {
                return redirect()->back()->with('error', 'Product is out of stock.');
            }
        $cart[$product->id] = [
                'id' => $product->id,
                'artisan_id' => $product->user_id, // Seller ID for grouping
                'name' => $product->name,
                'price' => $product->price,
                'qty' => 1,
                'img' => $product->img,
                'seller' => $product->user->name ?? 'Artisan',
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
        $cart = Session::get('cart', []);
        
        if (isset($cart[$request->id])) {
            $product = Product::find($request->id);
            if ($product && $request->qty > $product->stock) {
                return redirect()->back()->with('error', 'Only ' . $product->stock . ' items available.');
            }
            $cart[$request->id]['qty'] = max(1, $request->qty); 
            Session::put('cart', $cart);
        }

        return redirect()->back();
    }

    // 4. Remove Item
    public function destroy(Request $request)
    {
        $cart = Session::get('cart', []);
        
        if (isset($cart[$request->id])) {
            unset($cart[$request->id]);
            Session::put('cart', $cart);
        }

        return redirect()->back()->with('success', 'Item removed.');
    }

    public function buyAgain($orderId)
    {
        $order = \App\Models\Order::with('items')->where('user_id', Auth::id())->findOrFail($orderId);
        $cart = Session::get('cart', []);
        $addedCount = 0;
        $outOfStockCount = 0;

        foreach ($order->items as $item) {
            $product = Product::with('user')->find($item->product_id);
            
            if (!$product || $product->stock < 1) {
                $outOfStockCount++;
                continue;
            }

            // Add to cart logic (simplified from store method)
            if (isset($cart[$product->id])) {
                // If already in cart, just ensure we don't exceed stock?
                // Or just add 1? Or add original qty?
                // Let's add 1 for now to be safe, or min(original_qty, stock).
                // Usually "Buy Again" adds 1 of each unless specified.
                // Let's add 1.
                if ($cart[$product->id]['qty'] + 1 <= $product->stock) {
                    $cart[$product->id]['qty']++;
                    $addedCount++;
                } else {
                    $outOfStockCount++;
                }
            } else {
                $cart[$product->id] = [
                    'id' => $product->id,
                    'artisan_id' => $product->user_id,
                    'name' => $product->name,
                    'price' => $product->price,
                    'qty' => 1, // Start with 1
                    'img' => $product->img, 
                    'seller' => $product->user->name ?? 'Artisan',
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