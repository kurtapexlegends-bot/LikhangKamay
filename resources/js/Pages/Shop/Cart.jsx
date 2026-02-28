import React, { useState, useMemo } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import ShopLayout from '@/Layouts/ShopLayout';
import { Trash2, Minus, Plus, ShoppingBag, ArrowRight, ChevronRight, Package, ShieldCheck, Store, Loader2, Check, CheckCircle, AlertCircle, X } from 'lucide-react';

export default function Cart({ cart }) {
    const [updatingId, setUpdatingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());

    // --- FLASH MESSAGE HANDLING ---
    const { flash } = usePage().props;
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [toastType, setToastType] = useState('success'); // 'success' or 'error'

    React.useEffect(() => {
        if (flash.success) {
            setToastType('success');
            setToastMessage(flash.success);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 3000);
        }
        if (flash.error) {
            setToastType('error');
            setToastMessage(flash.error);
            setShowToast(true);
            setTimeout(() => setShowToast(false), 5000);
        }
    }, [flash]);

    // Convert the cart object (from PHP Session) into an array
    const cartItems = Object.values(cart || {});

    // Initialize selected items on first render
    useMemo(() => {
        if (selectedItems.size === 0 && cartItems.length > 0) {
            setSelectedItems(new Set(cartItems.map(item => item.id)));
        }
    }, [cartItems.length]);

    // Group items by seller
    const groupedBySeller = cartItems.reduce((acc, item) => {
        const seller = item.seller || 'Unknown Seller';
        if (!acc[seller]) acc[seller] = [];
        acc[seller].push(item);
        return acc;
    }, {});

    // Calculate totals based on selected items only
    const selectedCartItems = cartItems.filter(item => selectedItems.has(item.id));
    const totalAmount = selectedCartItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const totalItems = selectedCartItems.reduce((sum, item) => sum + item.qty, 0);

    // Check if all items are selected
    const allSelected = cartItems.length > 0 && selectedItems.size === cartItems.length;

    // Toggle single item selection
    const toggleItem = (id) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    // Toggle all items
    const toggleAll = () => {
        if (allSelected) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(cartItems.map(item => item.id)));
        }
    };

    // Toggle all items from a specific seller
    const toggleSeller = (sellerItems) => {
        const sellerIds = sellerItems.map(item => item.id);
        const allSellerSelected = sellerIds.every(id => selectedItems.has(id));
        
        const newSelected = new Set(selectedItems);
        if (allSellerSelected) {
            sellerIds.forEach(id => newSelected.delete(id));
        } else {
            sellerIds.forEach(id => newSelected.add(id));
        }
        setSelectedItems(newSelected);
    };

    const updateQty = (id, currentQty, change) => {
        const newQty = currentQty + change;
        if (newQty < 1) return;
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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                    <Link href="/" className="hover:text-clay-600">Home</Link>
                    <ChevronRight size={12} />
                    <span className="text-gray-600">Shopping Cart</span>
                </nav>

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
                                {Object.entries(groupedBySeller).map(([seller, items]) => {
                                    const sellerIds = items.map(item => item.id);
                                    const allSellerSelected = sellerIds.every(id => selectedItems.has(id));
                                    const someSellerSelected = sellerIds.some(id => selectedItems.has(id));

                                    return (
                                        <div key={seller}>
                                            {/* Seller Header */}
                                            <div className="px-4 py-2 bg-gray-50/50 border-t border-b border-gray-100 flex items-center gap-3">
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
                                                <Store size={14} className="text-gray-400" />
                                                <span className="text-sm font-medium text-gray-700">{seller}</span>
                                            </div>

                                            {/* Seller's Items */}
                                            {items.map((item) => (
                                                <div 
                                                    key={item.id} 
                                                    className={`grid grid-cols-1 sm:grid-cols-12 gap-4 px-4 py-4 border-b border-gray-50 items-center transition ${
                                                        removingId === item.id ? 'opacity-50' : ''
                                                    } ${!selectedItems.has(item.id) ? 'bg-gray-50/30' : ''}`}
                                                >
                                                    {/* Product Info with Checkbox */}
                                                    <div className="sm:col-span-6 flex gap-3 items-start">
                                                        <button
                                                            onClick={() => toggleItem(item.id)}
                                                            className={`w-4 h-4 rounded border flex items-center justify-center transition flex-shrink-0 mt-1 ${
                                                                selectedItems.has(item.id) 
                                                                    ? 'bg-clay-600 border-clay-600 text-white' 
                                                                    : 'border-gray-300 hover:border-clay-400'
                                                            }`}
                                                        >
                                                            {selectedItems.has(item.id) && <Check size={12} />}
                                                        </button>
                                                        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                                            <img 
                                                                src={item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : '/images/no-image.png'} 
                                                                alt={item.name} 
                                                                className="w-full h-full object-cover"
                                                                onError={(e) => { e.target.src = '/images/no-image.png'; }}
                                                            />
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <Link 
                                                                href={route('product.show', item.id)} 
                                                                className="text-sm font-medium text-gray-900 hover:text-clay-600 transition line-clamp-2"
                                                            >
                                                                {item.name}
                                                            </Link>
                                                            <p className="text-xs text-gray-400 mt-1">SKU: {item.sku || 'N/A'}</p>
                                                            <button 
                                                                onClick={() => removeItem(item.id)}
                                                                disabled={removingId === item.id}
                                                                className="text-xs text-red-400 hover:text-red-600 mt-1 flex items-center gap-1 sm:hidden"
                                                            >
                                                                {removingId === item.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                                                                Remove
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Unit Price */}
                                                    <div className="sm:col-span-2 text-center">
                                                        <span className="text-sm text-gray-500">₱{Number(item.price).toLocaleString()}</span>
                                                    </div>

                                                    {/* Quantity */}
                                                    <div className="sm:col-span-2 flex justify-center">
                                                        <div className="flex items-center border border-gray-200 rounded">
                                                            <button
                                                                onClick={() => updateQty(item.id, item.qty, -1)}
                                                                disabled={item.qty <= 1 || updatingId === item.id}
                                                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                                                            >
                                                                <Minus size={12} />
                                                            </button>
                                                            <span className="w-8 text-center text-sm font-medium text-gray-900">
                                                                {updatingId === item.id ? <Loader2 size={12} className="animate-spin mx-auto" /> : item.qty}
                                                            </span>
                                                            <button
                                                                onClick={() => updateQty(item.id, item.qty, 1)}
                                                                disabled={updatingId === item.id}
                                                                className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                                            >
                                                                <Plus size={12} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    {/* Total & Delete */}
                                                    <div className="sm:col-span-2 flex items-center justify-end gap-3">
                                                        <span className="text-sm font-semibold text-clay-600">
                                                            ₱{(item.price * item.qty).toLocaleString()}
                                                        </span>
                                                        <button 
                                                            onClick={() => removeItem(item.id)}
                                                            disabled={removingId === item.id}
                                                            className="hidden sm:flex w-7 h-7 items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition"
                                                        >
                                                            {removingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                        </button>
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
                                    ← Continue Shopping
                                </Link>
                            </div>
                        </div>

                        {/* ========== RIGHT: ORDER SUMMARY ========== */}
                        <div className="lg:col-span-4">
                            <div className="bg-white rounded-lg border border-gray-100 shadow-sm sticky top-20">
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
                                        <span className="text-gray-900">₱{totalAmount.toLocaleString()}</span>
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
                                            ₱{totalAmount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>

                                    <button
                                        onClick={proceedToCheckout}
                                        disabled={selectedItems.size === 0}
                                        className="w-full h-11 bg-clay-600 text-white rounded-sm font-medium flex items-center justify-center gap-2 hover:bg-clay-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Checkout ({selectedItems.size})
                                        <ArrowRight size={16} />
                                    </button>

                                    {selectedItems.size === 0 && (
                                        <p className="text-xs text-amber-600 text-center mt-2">
                                            Please select at least one item to checkout
                                        </p>
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
                                        <span>Secure checkout • Encrypted payments</span>
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

            {/* --- TOAST NOTIFICATION --- */}
            <div className={`fixed bottom-6 right-6 z-[100] transition-all duration-500 transform ${showToast ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0'}`}>
                <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl border ${toastType === 'success' ? 'bg-white border-green-100' : 'bg-white border-red-100'}`}>
                    <div className={`p-2 rounded-full ${toastType === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {toastType === 'success' ? <CheckCircle size={20} className="stroke-2" /> : <AlertCircle size={20} className="stroke-2" />}
                    </div>
                    <div>
                        <h4 className={`text-sm font-bold ${toastType === 'success' ? 'text-green-900' : 'text-red-900'}`}>
                            {toastType === 'success' ? 'Success' : 'Error'}
                        </h4>
                        <p className="text-xs text-gray-500">{toastMessage}</p>
                    </div>
                    <button onClick={() => setShowToast(false)} className="ml-2 text-gray-400 hover:text-gray-600"><X size={14} /></button>
                </div>
            </div>
        </ShopLayout>
    );
}