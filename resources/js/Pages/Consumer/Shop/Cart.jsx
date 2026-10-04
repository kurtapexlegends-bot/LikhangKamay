import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import ShopLayout from '@/Layouts/ShopLayout';
import StickyActionBar from '@/Components/StickyActionBar';
import SwipeableCartItemRow from '@/Components/Consumer/Shop/SwipeableCartItemRow';
import { Trash2, ShoppingBag, ArrowRight, ChevronRight, Package, ShieldCheck, Store, Loader2, Check, RotateCcw } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import useCartPersistence from '@/hooks/useCartPersistence';

export default function Cart({ cart }) {
    const [updatingId, setUpdatingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());
    const { addToast } = useToast();
    const currency = useMemo(() => new Intl.NumberFormat('en-PH', {
        style: 'currency',
        currency: 'PHP',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }), []);

    // --- FLASH MESSAGE HANDLING ---
    const { flash, auth } = usePage().props;
    useFlashToast(flash, addToast);

    const isPendingArtisan = auth?.user?.role === 'artisan' && auth?.user?.artisan_status === 'pending';
    const isAdmin = auth?.user?.role === 'super_admin' || auth?.user?.role === 'admin';

    // Convert the cart object (from PHP Session) into an array
    const cartItems = Object.values(cart || {});
    const getCartKey = (item) => item.cart_key || String(item.id);

    // Client-side cart persistence & session recovery
    const { savedBackup, isRestoring, restoreCart, dismissBackup } = useCartPersistence(cartItems);

    // Initialize selected items on first render
    useEffect(() => {
        if (selectedItems.size === 0 && cartItems.length > 0) {
            setSelectedItems(new Set(cartItems.map((item) => getCartKey(item))));
        }
    }, [cartItems.length]);

    const [activeStudioFilter, setActiveStudioFilter] = useState('all');

    // Group items by seller
    const groupedBySeller = useMemo(() => {
        return cartItems.reduce((acc, item) => {
            const seller = item.shop_name || item.seller || 'Unknown Seller';
            if (!acc[seller]) acc[seller] = [];
            acc[seller].push(item);
            return acc;
        }, {});
    }, [cartItems]);

    // Calculate totals based on selected items only
    const selectedCartItems = useMemo(() => {
        return cartItems.filter((item) => selectedItems.has(getCartKey(item)));
    }, [cartItems, selectedItems]);

    const totalAmount = useMemo(() => {
        return selectedCartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    }, [selectedCartItems]);

    const totalItems = useMemo(() => {
        return selectedCartItems.reduce((sum, item) => sum + item.qty, 0);
    }, [selectedCartItems]);

    const selectedSellers = useMemo(() => {
        const sellers = new Set();
        selectedCartItems.forEach((item) => {
            sellers.add(item.shop_name || item.seller || 'Unknown Seller');
        });
        return Array.from(sellers);
    }, [selectedCartItems]);

    // Check if all items are selected
    const allSelected = cartItems.length > 0 && selectedItems.size === cartItems.length;

    // Toggle single item selection
    const toggleItem = (id) => {
        const newSelected = new Set(selectedItems);
        const key = String(id);

        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedItems(newSelected);
    };

    // Toggle all items
    const toggleAll = () => {
        if (allSelected) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(cartItems.map((item) => getCartKey(item))));
        }
    };

    // Toggle all items from a specific seller
    const toggleSeller = (sellerItems) => {
        const sellerIds = sellerItems.map((item) => getCartKey(item));
        const allSellerSelected = sellerIds.every(id => selectedItems.has(id));
        
        const newSelected = new Set(selectedItems);
        if (allSellerSelected) {
            sellerIds.forEach(id => newSelected.delete(id));
        } else {
            sellerIds.forEach(id => newSelected.add(id));
        }
        setSelectedItems(newSelected);
    };

    const updateQty = (id, currentQty, change, minQty = 1) => {
        const newQty = currentQty + change;
        if (newQty < minQty) return;
        setUpdatingId(id);
        router.patch(route('cart.update'), { id, qty: newQty }, { 
            preserveScroll: true,
            onFinish: () => setUpdatingId(null),
        });
    };

    const removeItem = (id) => {
        setRemovingId(id);
        router.delete(route('cart.destroy'), { 
            data: { id }, 
            preserveScroll: true,
            onSuccess: () => {
                // Remove from selected items too
                const newSelected = new Set(selectedItems);
                newSelected.delete(id);
                setSelectedItems(newSelected);
            },
            onFinish: () => setRemovingId(null),
        });
    };

    const proceedToCheckout = () => {
        // Pass selected item IDs to checkout
        router.get(route('checkout.create'), { 
            items: Array.from(selectedItems) 
        });
    };

    return (
        <ShopLayout>
            <Head title="Shopping Cart" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-24 sm:py-8">
                
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                    <Link href="/" className="hover:text-clay-600">Home</Link>
                    <ChevronRight size={12} />
                    <span className="text-gray-600">Shopping Cart</span>
                </nav>

                {/* Artisan Studio Procurement Banner */}
                {auth?.user?.role === 'artisan' && (
                    <div className="mb-5 rounded-2xl border border-stone-200 bg-white p-4 text-xs text-stone-700 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <Store size={18} className="text-clay-600 shrink-0" />
                            <div>
                                <span className="font-bold text-stone-900 block">Workshop Materials Mode</span>
                                <span className="text-stone-500">You are logged in as an artisan. Sourcing materials will auto-sync directly to your inventory.</span>
                            </div>
                        </div>
                        <Link
                            href={route('seller.supply-hub.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-stone-800 shrink-0 transition-colors"
                        >
                            <span>Return to Supply Hub</span>
                            <ArrowRight size={13} />
                        </Link>
                    </div>
                )}

                {cartItems.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        
                        {/* ========== LEFT: CART ITEMS ========== */}
                        <div className="lg:col-span-8 space-y-4">
                            
                            {/* Cart Header */}
                            <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
                                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                    <h1 className="text-lg font-semibold text-gray-900">
                                        Shopping Cart
                                        <span className="ml-2 text-sm font-normal text-gray-400">({cartItems.length} items)</span>
                                    </h1>
                                </div>

                                {/* Studio Filter Tabs (when multiple sellers present) */}
                                {Object.keys(groupedBySeller).length > 1 && (
                                    <div className="px-4 py-2.5 bg-stone-50/80 border-b border-gray-100 flex items-center gap-2 overflow-x-auto no-scrollbar">
                                        <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                                            <Store size={12} className="text-clay-600" /> Studios:
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setActiveStudioFilter('all')}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                                                activeStudioFilter === 'all'
                                                    ? 'bg-clay-600 text-white shadow-2xs'
                                                    : 'bg-white text-stone-600 border border-stone-200 hover:border-clay-300'
                                            }`}
                                        >
                                            All Studios ({cartItems.length})
                                        </button>
                                        {Object.entries(groupedBySeller).map(([seller, items]) => (
                                            <button
                                                key={seller}
                                                type="button"
                                                onClick={() => setActiveStudioFilter(seller)}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-all ${
                                                    activeStudioFilter === seller
                                                        ? 'bg-clay-600 text-white shadow-2xs'
                                                        : 'bg-white text-stone-600 border border-stone-200 hover:border-clay-300'
                                                }`}
                                            >
                                                {seller} ({items.length})
                                            </button>
                                        ))}
                                    </div>
                                )}

                                {/* Table Header with Select All */}
                                <div className="hidden sm:grid grid-cols-12 gap-4 px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase items-center">
                                    <div className="col-span-6 flex items-center gap-3">
                                        <button
                                            onClick={toggleAll}
                                            className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                                allSelected 
                                                    ? 'bg-clay-600 border-clay-600 text-white' 
                                                    : 'border-gray-300 hover:border-clay-400'
                                            }`}
                                        >
                                            {allSelected && <Check size={12} />}
                                        </button>
                                        <span>Select All ({cartItems.length})</span>
                                    </div>
                                    <div className="col-span-2 text-center">Unit Price</div>
                                    <div className="col-span-2 text-center">Quantity</div>
                                    <div className="col-span-2 text-right">Total</div>
                                </div>

                                {/* Items grouped by seller */}
                                {Object.entries(groupedBySeller)
                                    .filter(([seller]) => activeStudioFilter === 'all' || activeStudioFilter === seller)
                                    .map(([seller, items], sellerIndex) => {
                                    const sellerIds = items.map((item) => getCartKey(item));
                                    const allSellerSelected = sellerIds.every(id => selectedItems.has(id));
                                    const someSellerSelected = sellerIds.some(id => selectedItems.has(id));

                                    return (
                                        <div key={seller}>
                                            {/* Seller Header */}
                                            <div className="px-4 py-2.5 bg-gray-50/70 border-t border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                                                <div className="flex items-center gap-3">
                                                    <button
                                                        onClick={() => toggleSeller(items)}
                                                        className={`w-4 h-4 rounded border flex items-center justify-center transition ${
                                                            allSellerSelected 
                                                                ? 'bg-clay-600 border-clay-600 text-white' 
                                                                : someSellerSelected
                                                                    ? 'bg-clay-200 border-clay-400'
                                                                    : 'border-gray-300 hover:border-clay-400'
                                                        }`}
                                                    >
                                                        {allSellerSelected && <Check size={12} />}
                                                    </button>
                                                    <Store size={14} className="text-clay-600" />
                                                    <span className="text-sm font-bold text-gray-900">{seller}</span>
                                                    {Object.keys(groupedBySeller).length > 1 && (
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-clay-50 text-clay-700 border border-clay-200/80">
                                                            Studio Package {sellerIndex + 1}
                                                        </span>
                                                    )}
                                                </div>

                                                {Object.keys(groupedBySeller).length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const ids = new Set(items.map((item) => getCartKey(item)));
                                                            setSelectedItems(ids);
                                                        }}
                                                        className="text-[11px] font-semibold text-clay-700 hover:text-clay-900 transition"
                                                    >
                                                        Checkout Only This Studio
                                                    </button>
                                                )}
                                            </div>

                                            {/* Seller's Items */}
                                            {items.map((item) => (
                                                <SwipeableCartItemRow
                                                    key={getCartKey(item)}
                                                    item={item}
                                                    cartKey={getCartKey(item)}
                                                    isSelected={selectedItems.has(getCartKey(item))}
                                                    onToggle={toggleItem}
                                                    onRemove={removeItem}
                                                    onUpdateQty={updateQty}
                                                    isRemoving={removingId === getCartKey(item)}
                                                    isUpdating={updatingId === getCartKey(item)}
                                                    currency={currency}
                                                />
                                            ))}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Continue Shopping */}
                            <div className="flex justify-between items-center">
                                <Link 
                                    href={route('shop.index')} 
                                    className="text-sm text-gray-500 hover:text-clay-600 transition flex items-center gap-1"
                                >
                                    &larr; Continue Shopping
                                </Link>
                            </div>
                        </div>

                        {/* ========== RIGHT: ORDER SUMMARY ========== */}
                        <div className="lg:col-span-4 self-start lg:sticky lg:top-24">
                            <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
                                <div className="px-4 py-3 border-b border-gray-100">
                                    <h2 className="text-base font-semibold text-gray-900">Order Summary</h2>
                                </div>

                                <div className="p-4 space-y-3 text-sm">
                                    <div className="flex justify-between text-gray-500">
                                        <span>Selected Items</span>
                                        <span className="text-gray-900">{selectedItems.size} of {cartItems.length}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <span>Subtotal ({totalItems} items)</span>
                                        <span className="text-gray-900">{currency.format(totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-500">
                                        <span>Shipping</span>
                                        <span className="text-gray-400 text-xs">Calculated at checkout</span>
                                    </div>
                                </div>

                                <div className="px-4 py-3 border-t border-gray-100">
                                    <div className="flex justify-between items-end mb-4">
                                        <span className="text-sm font-medium text-gray-700">Total</span>
                                        <span className="text-xl font-bold text-clay-600">
                                            {currency.format(totalAmount)}
                                        </span>
                                    </div>

                                    {isPendingArtisan ? (
                                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-xs font-bold text-amber-700 shadow-sm">
                                            Checkout is disabled while your shop application is under review.
                                        </div>
                                    ) : isAdmin ? (
                                        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-center text-xs font-bold text-stone-700 shadow-sm">
                                            Purchasing and checkout are disabled for administrator accounts.
                                        </div>
                                    ) : (
                                        <>
                                            {selectedSellers.length > 1 && (
                                                <div className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/70 p-3 text-xs text-amber-950 flex items-start gap-2.5">
                                                    <Store size={15} className="text-amber-700 shrink-0 mt-0.5" />
                                                    <div className="space-y-0.5 leading-relaxed text-left">
                                                        <span className="font-bold text-amber-950 block">Multi-Workshop Order ({selectedSellers.length} Studios)</span>
                                                        <p className="text-[11px] text-amber-900">
                                                            Your cart contains items from {selectedSellers.length} independent studios. Each artisan will prepare and ship their goods in a separate package with individual tracking.
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={proceedToCheckout}
                                                disabled={selectedItems.size === 0}
                                                className="w-full h-11 bg-clay-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-clay-700 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100"
                                            >
                                                Checkout ({selectedItems.size})
                                                <ArrowRight size={16} />
                                            </button>

                                            {selectedItems.size === 0 && (
                                                <p className="text-xs text-amber-600 text-center mt-2">
                                                    Please select at least one item to checkout
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>

                                {/* Trust Badges */}
                                <div className="px-4 py-3 border-t border-gray-100 space-y-2">
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <Package size={14} className="text-clay-500" />
                                        <span>Fragile items packed with extra care</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <ShieldCheck size={14} className="text-clay-500" />
                                        <span>Secure checkout - Encrypted payments</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ========== EMPTY STATE ========== */
                    <div className="space-y-4">
                        {savedBackup && savedBackup.items?.length > 0 && (
                            <div className="rounded-2xl border border-clay-200/80 bg-clay-50/50 p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm animate-in fade-in duration-200">
                                <div className="flex items-start gap-3">
                                    <div className="p-2.5 bg-clay-100 text-clay-700 rounded-xl shrink-0">
                                        <RotateCcw size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-stone-900">
                                            Restore {savedBackup.items.length} item{savedBackup.items.length > 1 ? 's' : ''} from your previous visit?
                                        </h3>
                                        <p className="text-xs text-stone-500 mt-0.5">
                                            We saved your handcrafted pottery selections so you can pick up right where you left off.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end">
                                    <button
                                        type="button"
                                        onClick={dismissBackup}
                                        disabled={isRestoring}
                                        className="px-3.5 py-2 text-xs font-semibold text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors min-h-[38px]"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        type="button"
                                        onClick={restoreCart}
                                        disabled={isRestoring}
                                        className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold rounded-xl shadow-sm transition active:scale-95 disabled:opacity-50 min-h-[38px]"
                                    >
                                        {isRestoring ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                        <span>Restore Cart</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                <ShoppingBag size={36} className="text-gray-300" />
                            </div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-1">Your cart is empty</h2>
                            <p className="text-sm text-gray-500 mb-6 max-w-sm">
                                Looks like you haven't added any items yet. Explore our collection of handcrafted pottery.
                            </p>
                            <Link
                                href={route('shop.index')}
                                className="px-6 py-2.5 bg-clay-600 text-white text-sm font-medium rounded-sm hover:bg-clay-700 transition flex items-center gap-2"
                            >
                                Start Shopping
                                <ArrowRight size={16} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            </div>

            {/* Sticky Action Bar on Mobile */}
            {cartItems.length > 0 && (
                <StickyActionBar>
                    <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-medium text-stone-500 truncate">
                            Total ({selectedItems.size} {selectedItems.size === 1 ? 'item' : 'items'}
                            {selectedSellers.length > 1 ? ` · ${selectedSellers.length} studios` : ''})
                        </span>
                        <span className="text-base font-bold text-clay-600 truncate">
                            {currency.format(totalAmount)}
                        </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {isPendingArtisan ? (
                            <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-xl">
                                Review Pending
                            </span>
                        ) : isAdmin ? (
                            <span className="text-xs font-semibold text-stone-700 bg-stone-100 border border-stone-200 px-3 py-2 rounded-xl">
                                Admin Account
                            </span>
                        ) : (
                            <button
                                onClick={proceedToCheckout}
                                disabled={selectedItems.size === 0}
                                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-clay-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-clay-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all min-h-[44px]"
                            >
                                <span>Checkout</span>
                                <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </StickyActionBar>
            )}
        </ShopLayout>
    );
}

