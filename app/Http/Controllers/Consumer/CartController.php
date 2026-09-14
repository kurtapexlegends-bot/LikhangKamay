<?php

namespace App\Http\Controllers\Consumer;

use App\Http\Controllers\Controller;
use App\Services\Cart\CartService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;
use Inertia\Response;

class CartController extends Controller
{
    public function __construct(
        protected CartService $cartService
    ) {}

    /**
     * Display Cart Page.
     */
    public function index(Request $request): Response|JsonResponse
    {
        $cart = $this->cartService->getCart();

        if ($request->wantsJson() && !$request->header('X-Inertia')) {
            return response()->json(['cart' => $cart]);
        }

        return Inertia::render('Consumer/Shop/Cart', [
            'cart' => $cart,
        ]);
    }

    /**
     * Add an item to the shopping cart.
     */
    public function store(Request $request): RedirectResponse|JsonResponse
    {
        if (Auth::check() && in_array(Auth::user()->role, ['super_admin', 'admin'], true)) {
            $msg = 'Administrators are not permitted to make purchases.';
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => $msg], 403);
            }
            return redirect()->back()->with('error', $msg);
        }

        $validated = $request->validate([
            'product_id' => 'required|integer|exists:products,id',
            'quantity' => 'nullable|integer|min:1',
            'variant' => 'nullable|string|max:120',
        ]);

        $result = $this->cartService->addItem($validated);

        if (!$result['success']) {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => $result['message']], $result['status'] ?? 422);
            }
            return redirect()->back()->with('error', $result['message']);
        }

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'cart' => $result['cart'],
                'cart_count' => $result['cart_count'],
            ]);
        }

        return redirect()->back()->with('success', $result['message']);
    }

    /**
     * Update quantity of a cart item.
     */
    public function update(Request $request): RedirectResponse|JsonResponse
    {
        $id = $request->input('id') ?? $request->input('cart_key');
        $qty = (int) ($request->input('qty') ?? $request->input('quantity') ?? 1);

        if (!$id) {
            $msg = 'Cart item identifier is required.';
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => $msg], 422);
            }
            return redirect()->back()->with('error', $msg);
        }

        $result = $this->cartService->updateQuantity((string) $id, $qty);

        if (!$result['success']) {
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => $result['message']], $result['status'] ?? 422);
            }
            return redirect()->back()->with('error', $result['message']);
        }

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'cart' => $result['cart'],
                'cart_count' => $result['cart_count'],
            ]);
        }

        return redirect()->back()->with('success', $result['message']);
    }

    /**
     * Remove an item from the cart.
     */
    public function destroy(Request $request): RedirectResponse|JsonResponse
    {
        $id = $request->input('id') ?? $request->input('cart_key');

        if (!$id) {
            $msg = 'Cart item identifier is required.';
            if ($request->wantsJson() || $request->ajax()) {
                return response()->json(['success' => false, 'message' => $msg], 422);
            }
            return redirect()->back()->with('error', $msg);
        }

        $result = $this->cartService->removeItem((string) $id);

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'cart' => $result['cart'],
                'cart_count' => $result['cart_count'],
            ]);
        }

        return redirect()->back()->with('success', $result['message']);
    }

    /**
     * Clear all cart contents.
     */
    public function clear(Request $request): RedirectResponse|JsonResponse
    {
        $result = $this->cartService->clearCart();

        if ($request->wantsJson() || $request->ajax()) {
            return response()->json([
                'success' => true,
                'message' => $result['message'],
                'cart' => $result['cart'],
                'cart_count' => 0,
            ]);
        }

        return redirect()->back()->with('success', $result['message']);
    }

    /**
     * Re-order items from a previous order into current cart.
     */
    public function buyAgain(int|string $orderId): RedirectResponse
    {
        if (Auth::check() && in_array(Auth::user()->role, ['super_admin', 'admin'], true)) {
            return redirect()->back()->with('error', 'Administrators are not permitted to make purchases.');
        }

        $result = $this->cartService->buyAgain($orderId, (int) Auth::id());
        $addedCount = $result['addedCount'];
        $outOfStockCount = $result['outOfStockCount'];

        if ($addedCount > 0) {
            if ($outOfStockCount > 0) {
                return redirect()->route('cart.index')->with('warning', "{$addedCount} items added to cart. {$outOfStockCount} items were out of stock.");
            }
            return redirect()->route('cart.index')->with('success', 'Items added to cart!');
        }

        return redirect()->back()->with('error', 'Unable to add items (Out of stock or unavailable).');
    }

    /**
     * Restore multiple items into cart from client-side persistent backup.
     */
    public function restore(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|exists:products,id',
            'items.*.qty' => 'required|integer|min:1',
            'items.*.variant' => 'nullable|string|max:120',
        ]);

        $restoredCount = $this->cartService->restoreItems($validated['items']);

        if ($restoredCount > 0) {
            return redirect()->route('cart.index')->with('success', "Restored {$restoredCount} item(s) from your previous session.");
        }

        return redirect()->route('cart.index')->with('info', 'Saved items could not be restored (currently out of stock).');
    }
}
