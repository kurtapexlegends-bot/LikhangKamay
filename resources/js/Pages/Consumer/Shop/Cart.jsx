import React, { useEffect, useMemo, useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import ShopLayout from '@/Layouts/ShopLayout';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ChevronRight, Package, ShieldCheck, Store, Loader2, Check } from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';

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

    // Initialize selected items on first render
    useEffect(() => {
        if (selectedItems.size === 0 && cartItems.length > 0) {
            setSelectedItems(new Set(cartItems.map((item) => getCartKey(item))));
        }
    }, [cartItems.length]);

    // Group items by seller
    const groupedBySeller = cartItems.reduce((acc, item) => {
        const seller = item.shop_name || item.seller || 'Unknown Seller';
        if (!acc[seller]) acc[seller] = [];
        acc[seller].push(item);
        return acc;
    }, {});

    // Calculate totals based on selected items only
    const selectedCartItems = cartItems.filter((item) => selectedItems.has(getCartKey(item)));
    const totalAmount = selectedCartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalItems = selectedCartItems.reduce((sum, item) => sum + item.qty, 0);

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

    const updateQuantity = (item, newQty) => {
        const stockLimit = item.stock !== undefined && item.stock !== null ? Number(item.stock) : 99;

        if (newQty < 1) return;
        if (newQty > stockLimit) {
            addToast(`Only ${stockLimit} units available in stock.`, 'warning');
            return;
        }
        setUpdatingId(getCartKey(item));
        router.patch(route('cart.update', getCartKey(item)), { qty: newQty }, {
            preserveScroll: true,
            onFinish: () => setUpdatingId(null),
        });
    };

    const removeItem = (item) => {
        setRemovingId(getCartKey(item));
        router.delete(route('cart.remove', getCartKey(item)), {
            preserveScroll: true,
            onFinish: () => {
                setRemovingId(null);
                const newSelected = new Set(selectedItems);
                newSelected.delete(getCartKey(item));
                setSelectedItems(newSelected);
            },
        });
    };

    const proceedToCheckout = () => {
        if (selectedItems.size === 0) return;
        const selectedKeys = Array.from(selectedItems).join(',');
        router.get(route('checkout.create'), { items: selectedKeys });
    };

    return (
        <ShopLayout>
            <Head title="Shopping Cart" />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-12">

                {/* BREADCRUMB */}
                <nav className="flex items-center gap-2 text-xs text-gray-600 mb-6">
                    <Link href={route('home')} className="hover:text-[#7A5037]">Home</Link>
                    <ChevronRight size={12} />
                    <Link href={route('shop.index')} className="hover:text-[#7A5037]">Shop</Link>
                    <ChevronRight size={12} />
                    <span className="text-[#7A5037] font-bold">Shopping Cart</span>
                </nav>

                <h1 className="text-2xl font-bold text-gray-900 mb-6">
                    Shopping Cart ({cartItems.length})
                </h1>

                {cartItems.length > 0 ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                        
                        {/* ========== LEFT: CART ITEMS BY SELLER ========== */}
                        <div className="lg:col-span-8 space-y-6">

                            {/* Select All Bar */}
                            <div className="bg-white rounded-lg border border-gray-100 p-4 flex items-center justify-between shadow-sm">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input 
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        className="w-4 h-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                    />
                                    <span className="text-sm font-semibold text-gray-800">
                                        Select All ({cartItems.length} items)
                                    </span>
                                </label>
                                {selectedItems.size > 0 && (
                                    <span className="text-xs text-[#7A5037] font-semibold">
                                        {selectedItems.size} selected
                                    </span>
                                )}
                            </div>

                            {/* Grouped by Seller */}
                            <div className="space-y-4">
                                {Object.entries(groupedBySeller).map(([sellerName, sellerItems]) => {
                                    const sellerIds = sellerItems.map(i => getCartKey(i));
                                    const allSellerSelected = sellerIds.every(id => selectedItems.has(id));
                                    const someSellerSelected = sellerIds.some(id => selectedItems.has(id));

                                    return (
                                        <div key={sellerName} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden">
                                            {/* Seller Header */}
                                            <div className="bg-stone-50/70 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                                    <input 
                                                        type="checkbox"
                                                        checked={allSellerSelected}
                                                        ref={(el) => {
                                                            if (el) el.indeterminate = !allSellerSelected && someSellerSelected;
                                                        }}
                                                        onChange={() => toggleSeller(sellerItems)}
                                                        className="w-4 h-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <Store size={15} className="text-clay-600" />
                                                        <span className="text-sm font-bold text-gray-900">{sellerName}</span>
                                                    </div>
                                                </label>
                                                <span className="text-xs text-gray-500">
                                                    {sellerItems.length} {sellerItems.length === 1 ? 'item' : 'items'}
                                                </span>
                                            </div>

                                            {/* Seller Items */}
                                            {sellerItems.map((item, idx) => (
                                                <div 
                                                    key={getCartKey(item)}
                                                    className={`p-4 flex items-center gap-4 transition-colors ${
                                                        idx < sellerItems.length - 1 ? 'border-b border-gray-100' : ''
                                                    } ${selectedItems.has(getCartKey(item)) ? 'bg-white' : 'bg-stone-50/30'}`}
                                                >
                                                    {/* Selection Checkbox */}
                                                    <input 
                                                        type="checkbox"
                                                        checked={selectedItems.has(getCartKey(item))}
                                                        onChange={() => toggleItem(getCartKey(item))}
                                                        className="w-4 h-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer shrink-0"
                                                    />

                                                    {/* Product Thumbnail */}
                                                    {(() => {
                                                        const rawImg = item.image || item.img || item.cover_photo_path;
                                                        const imgUrl = rawImg ? (rawImg.startsWith('http') ? rawImg : (rawImg.startsWith('/storage') ? rawImg : `/storage/${rawImg}`)) : null;

                                                        return (
                                                            <Link 
                                                                href={item.product_id ? route('product.show', item.product_id) : (item.id ? route('product.show', item.id) : '#')} 
                                                                className="w-20 h-20 bg-stone-100 rounded-lg overflow-hidden shrink-0 border border-stone-200"
                                                            >
                                                                {imgUrl ? (
                                                                    <img 
                                                                        src={imgUrl} 
                                                                        alt={item.name} 
                                                                        className="w-full h-full object-cover"
                                                                        onError={(e) => {
                                                                            e.currentTarget.onerror = null;
                                                                            e.currentTarget.src = '/images/no-image.png';
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center text-stone-300">
                                                                        <Package size={24} />
                                                                    </div>
                                                                )}
                                                            </Link>
                                                        );
                                                    })()}

                                                    {/* Item Info & Actions */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex justify-between items-start gap-2">
                                                            <Link 
                                                                href={item.product_id ? route('product.show', item.product_id) : (item.id ? route('product.show', item.id) : '#')} 
                                                                className="text-sm font-semibold text-gray-900 hover:text-clay-600 transition truncate"
                                                            >
                                                                {item.name}
                                                            </Link>
                                                        </div>

                                                        {/* Unit Price */}
                                                        <div className="mt-1 flex items-baseline gap-2">
                                                            <span className="text-sm font-bold text-[#7A5037]">
                                                                {currency.format(item.price)}
                                                            </span>
                                                            {item.original_price && Number(item.original_price) > Number(item.price) && (
                                                                <span className="text-xs text-gray-400 line-through">
                                                                    {currency.format(item.original_price)}
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Quantity & Delete Controls */}
                                                        <div className="mt-3 flex items-center justify-between">
                                                            {/* Quantity Controls */}
                                                            <div className="flex items-center border border-gray-200 rounded-lg bg-stone-50">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateQuantity(item, item.qty - 1)}
                                                                    disabled={updatingId === getCartKey(item) || item.qty <= 1}
                                                                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-stone-100 rounded-l-lg disabled:opacity-30 transition"
                                                                    title="Decrease"
                                                                >
                                                                    <Minus size={13} />
                                                                </button>
                                                                <span className="w-9 text-center text-xs font-bold text-gray-900">
                                                                    {updatingId === getCartKey(item) ? (
                                                                        <Loader2 size={12} className="animate-spin inline text-clay-600" />
                                                                    ) : (
                                                                        item.qty
                                                                    )}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => updateQuantity(item, item.qty + 1)}
                                                                    disabled={updatingId === getCartKey(item) || (item.stock !== undefined && item.qty >= Number(item.stock))}
                                                                    className="w-8 h-8 flex items-center justify-center text-gray-600 hover:bg-stone-100 rounded-r-lg disabled:opacity-30 transition"
                                                                    title="Increase"
                                                                >
                                                                    <Plus size={13} />
                                                                </button>
                                                            </div>

                                                            {/* Delete Button */}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeItem(item)}
                                                                disabled={removingId === getCartKey(item)}
                                                                className="text-stone-400 hover:text-red-600 transition p-1.5 rounded-lg hover:bg-stone-100 disabled:opacity-50"
                                                                title="Remove Item"
                                                            >
                                                                {removingId === getCartKey(item) ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
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
                                            <button
                                                onClick={proceedToCheckout}
                                                disabled={selectedItems.size === 0}
                                                className="hidden lg:flex w-full h-11 bg-clay-600 text-white rounded-xl font-bold items-center justify-center gap-2 hover:bg-clay-700 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:active:scale-100"
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
                )}

            </div>

            {/* Mobile Sticky Bottom Checkout Bar */}
            {cartItems.length > 0 && !isPendingArtisan && !isAdmin && (
                <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200 p-3.5 flex items-center justify-between shadow-2xl lg:hidden">
                    <div>
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider block">Total Amount</span>
                        <span className="text-lg font-extrabold text-clay-600 leading-tight">
                            {currency.format(totalAmount)}
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={proceedToCheckout}
                        disabled={selectedItems.size === 0}
                        className="inline-flex items-center justify-center gap-2 bg-clay-600 text-white text-xs font-extrabold px-6 py-3 rounded-xl shadow-lg hover:bg-clay-700 active:scale-95 transition disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                    >
                        Checkout ({selectedItems.size})
                        <ArrowRight size={15} />
                    </button>
                </div>
            )}
        </ShopLayout>
    );
}
