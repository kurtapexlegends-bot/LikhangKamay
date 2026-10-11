/* global route */
import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import ShopLayout from '@/Layouts/ShopLayout';
import StickyActionBar from '@/Components/StickyActionBar';
import SwipeableCartItemRow from '@/Components/Consumer/Shop/SwipeableCartItemRow';
import UnavailableCartItemsSection from '@/Components/Consumer/Shop/UnavailableCartItemsSection';
import { ShoppingBag, ArrowRight, ChevronRight, Package, ShieldCheck, Store, Loader2, Check, RotateCcw } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import useCartPersistence from '@/hooks/useCartPersistence';
import { useConfirm } from '@/hooks/useConfirm';

export default function Cart({ cart }) {
    const [updatingId, setUpdatingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [isClearingUnavailable, setIsClearingUnavailable] = useState(false);
    const { addToast } = useToast();
    const { confirm, ConfirmationDialog } = useConfirm();
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

    // Split items into available and unavailable (Shopee/TikTok Shop pattern)
    const availableItems = useMemo(() => cartItems.filter((item) => item.is_available !== false), [cartItems]);
    const unavailableItems = useMemo(() => cartItems.filter((item) => item.is_available === false), [cartItems]);

    // Initial selected items (select available items)
    const [selectedItems, setSelectedItems] = useState(() => {
        const items = Object.values(cart || {}).filter((item) => item.is_available !== false);
        return new Set(items.map((item) => item.cart_key || String(item.id)));
    });

    // Client-side cart persistence & session recovery
    const { savedBackup, isRestoring, restoreCart, dismissBackup } = useCartPersistence(cartItems);

    // Keep selection synchronized with available items and purge unavailable items
    useEffect(() => {
        setSelectedItems((prev) => {
            if (prev.size === 0 && availableItems.length > 0) {
                return new Set(availableItems.map((item) => getCartKey(item)));
            }
            const next = new Set();
            for (const id of prev) {
                if (availableItems.some((item) => getCartKey(item) === id)) {
                    next.add(id);
                }
            }
            if (next.size !== prev.size) {
                return next;
            }
            return prev;
        });
    }, [availableItems]);

    const [activeStudioFilter, setActiveStudioFilter] = useState('all');

    // Group available items by seller
    const groupedBySeller = useMemo(() => {
        return availableItems.reduce((acc, item) => {
            const seller = item.shop_name || item.seller || 'Unknown Seller';
            if (!acc[seller]) acc[seller] = [];
            acc[seller].push(item);
            return acc;
        }, {});
    }, [availableItems]);

    // Calculate totals based on selected available items only
    const selectedCartItems = useMemo(() => {
        return availableItems.filter((item) => selectedItems.has(getCartKey(item)));
    }, [availableItems, selectedItems]);

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

    // Check if all available items are selected
    const allSelected = availableItems.length > 0 && selectedItems.size === availableItems.length;

    // Toggle single item selection
    const toggleItem = (id) => {
        const isAvailable = availableItems.some((item) => getCartKey(item) === String(id));
        if (!isAvailable) return;

        const newSelected = new Set(selectedItems);
        const key = String(id);

        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelectedItems(newSelected);
    };

    // Toggle all available items
    const toggleAll = () => {
        if (allSelected) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(availableItems.map((item) => getCartKey(item))));
        }
    };

    // Toggle all items from a specific seller
    const toggleSeller = (sellerItems) => {
        const sellerAvailableItems = sellerItems.filter((item) => item.is_available !== false);
        const sellerIds = sellerAvailableItems.map((item) => getCartKey(item));
        const allSellerSelected = sellerIds.length > 0 && sellerIds.every(id => selectedItems.has(id));
        
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

    const removeItem = async (id) => {
        const ok = await confirm({
            title: 'Remove Item from Cart?',
            message: 'Are you sure you want to remove this handcrafted piece from your cart?',
            confirmText: 'Remove Item',
            intent: 'danger',
        });
        if (!ok) return;

        setRemovingId(id);
        router.delete(route('cart.destroy'), { 
            data: { id }, 
            preserveScroll: true,
            onSuccess: () => {
                const newSelected = new Set(selectedItems);
                newSelected.delete(id);
                setSelectedItems(newSelected);
            },
            onFinish: () => setRemovingId(null),
        });
    };

    const clearUnavailableItems = async () => {
        if (unavailableItems.length === 0) return;
        const ok = await confirm({
            title: 'Clear Unavailable Items?',
            message: `Remove all ${unavailableItems.length} unavailable piece${unavailableItems.length > 1 ? 's' : ''} from your cart?`,
            confirmText: 'Clear Items',
            intent: 'danger',
        });
        if (!ok) return;

        setIsClearingUnavailable(true);
        router.delete(route('cart.clear-unavailable'), {
            preserveScroll: true,
            onSuccess: () => {
                addToast(`Cleared ${unavailableItems.length} unavailable item(s).`, 'success');
            },
            onFinish: () => setIsClearingUnavailable(false),
        });
    };

    const proceedToCheckout = () => {
        if (!auth?.user) {
            router.visit(route('login'));
            return;
        }

        const validSelected = Array.from(selectedItems).filter((key) =>
            availableItems.some((item) => getCartKey(item) === key)
        );

        if (validSelected.length === 0) {
            addToast('Please select at least one available handcrafted piece to proceed.', 'error');
            return;
        }

        // Pass selected item IDs to checkout
        router.get(route('checkout.create'), { 
            items: validSelected 
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
                            
                            {availableItems.length > 0 ? (
                                /* Cart Header & Available Items */
                                <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
                                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                        <h1 className="text-lg font-semibold text-gray-900">
                                            Shopping Cart
                                            <span className="ml-2 text-sm font-normal text-gray-400">({availableItems.length} available)</span>
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
                                                All Studios ({availableItems.length})
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
                                            <span>Select All ({availableItems.length})</span>
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
                            ) : (
                                /* When all items in cart are unavailable */
                                <div className="bg-white rounded-2xl border border-stone-200/90 p-6 text-center shadow-2xs space-y-3">
                                    <div className="w-12 h-12 mx-auto rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
                                        <Package size={22} />
                                    </div>
                                    <div className="space-y-1">
                                        <h2 className="text-base font-bold text-stone-900">
                                            No Available Pieces in Cart
                                        </h2>
                                        <p className="text-xs text-stone-500 max-w-sm mx-auto">
                                            All handcrafted items currently in your cart are out of stock or delisted. You can clear them below to discover new pieces.
                                        </p>
                                    </div>
                                    <div className="pt-1 flex items-center justify-center gap-2">
                                        <Link
                                            href={route('shop.index')}
                                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-clay-600 hover:bg-clay-700 text-white text-xs font-bold rounded-xl shadow-2xs transition active:scale-95 min-h-[38px]"
                                        >
                                            <span>Explore Artisan Shop</span>
                                            <ArrowRight size={13} />
                                        </Link>
                                    </div>
                                </div>
                            )}

                            {/* Shopee / TikTok style Unavailable Items Section */}
                            <UnavailableCartItemsSection
                                items={unavailableItems}
                                onRemove={removeItem}
                                onClearAll={clearUnavailableItems}
                                isClearing={isClearingUnavailable}
                                removingId={removingId}
                                currency={currency}
                            />

                            {/* Continue Shopping */}
                            <div className="flex justify-between items-center pt-2">
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
                                        <span className="text-gray-900">{selectedItems.size} of {availableItems.length}</span>
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
                                                disabled={selectedItems.size === 0 || availableItems.length === 0}
                                                className="w-full h-11 bg-clay-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-clay-700 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100"
                                            >
                                                Checkout ({selectedItems.size})
                                                <ArrowRight size={16} />
                                            </button>

                                            {availableItems.length === 0 ? (
                                                <p className="text-xs text-amber-600 text-center mt-2">
                                                    All items in your cart are currently unavailable
                                                </p>
                                            ) : selectedItems.size === 0 ? (
                                                <p className="text-xs text-amber-600 text-center mt-2">
                                                    Please select at least one item to checkout
                                                </p>
                                            ) : null}
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
                                disabled={selectedItems.size === 0 || availableItems.length === 0}
                                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-clay-600 text-white rounded-xl text-xs font-bold shadow-md hover:bg-clay-700 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100 transition-all min-h-[44px]"
                            >
                                <span>Checkout</span>
                                <ArrowRight size={14} />
                            </button>
                        )}
                    </div>
                </StickyActionBar>
            )}

            {ConfirmationDialog}
        </ShopLayout>
    );
}

