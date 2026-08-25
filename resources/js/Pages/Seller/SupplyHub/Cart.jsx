import React, { useMemo, useState, useEffect } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import SellerWorkspaceLayout, { useSellerWorkspaceShell } from '@/Layouts/SellerWorkspaceLayout';
import SellerHeader from '@/Layouts/SellerHeader';
import { 
    Store, Truck, Package, Trash2, Minus, Plus, 
    ArrowRight, Check, MessageSquare, AlertTriangle, ShieldCheck, ShoppingCart, Boxes, Layers
} from 'lucide-react';
import { useToast } from '@/Components/ToastContext';
import useFlashToast from '@/hooks/useFlashToast';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SourcingCart({
    cart = {},
    myPublishedCount = 0,
    activeOrdersCount = 0,
    pricing,
}) {
    const { auth, flash } = usePage().props;
    const { addToast } = useToast();
    const { openSidebar } = useSellerWorkspaceShell();
    useFlashToast(flash, addToast);

    const [updatingId, setUpdatingId] = useState(null);
    const [removingId, setRemovingId] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());

    const convenienceFeeRate = pricing?.convenience_fee_rate ?? 0.04;
    const cartItems = Object.values(cart || {});
    const getCartKey = (item) => item.cart_key || String(item.id);

    // Initialize selected items
    useEffect(() => {
        if (selectedItems.size === 0 && cartItems.length > 0) {
            setSelectedItems(new Set(cartItems.map((item) => getCartKey(item))));
        }
    }, [cartItems.length]);

    // Group items by supplier studio
    const groupedBySupplier = useMemo(() => {
        const groups = {};
        cartItems.forEach((item) => {
            const supplierId = item.seller_id || item.user_id || 1;
            const supplierName = item.shop_name || item.seller || 'Artisan Workshop';
            if (!groups[supplierId]) {
                groups[supplierId] = {
                    supplierId,
                    supplierName,
                    items: [],
                };
            }
            groups[supplierId].items.push(item);
        });
        return Object.values(groups);
    }, [cartItems]);

    // Filter selected items
    const selectedCartItems = cartItems.filter((item) => selectedItems.has(getCartKey(item)));

    // Calculate totals & weight
    const { merchandiseSubtotal, totalWeight, totalCount } = useMemo(() => {
        let subtotal = 0;
        let weight = 0;
        let count = 0;

        selectedCartItems.forEach((item) => {
            const qty = Number(item.qty || 1);
            const unitPrice = (item.wholesale_price && item.wholesale_min_qty && qty >= item.wholesale_min_qty)
                ? Number(item.wholesale_price)
                : Number(item.effective_price || item.price || 0);
            
            subtotal += unitPrice * qty;
            weight += (Number(item.weight) || 1.0) * qty * 1.10;
            count += qty;
        });

        return {
            merchandiseSubtotal: subtotal,
            totalWeight: Math.round(weight * 10) / 10,
            totalCount: count,
        };
    }, [selectedCartItems]);

    const platformFee = Number((merchandiseSubtotal * convenienceFeeRate).toFixed(2));
    const grandTotal = Number((merchandiseSubtotal + platformFee).toFixed(2));

    // Vehicle sizing
    const recommendedVehicle = useMemo(() => {
        if (totalWeight > 300) return 'Large Van (Up to 1000kg)';
        if (totalWeight > 200) return 'MPV (Up to 300kg)';
        if (totalWeight > 20) return '4-Wheel Sedan (Up to 200kg)';
        return 'Motorcycle (Up to 20kg)';
    }, [totalWeight]);

    const allSelected = cartItems.length > 0 && selectedItems.size === cartItems.length;

    const toggleItem = (itemKey) => {
        const next = new Set(selectedItems);
        if (next.has(itemKey)) {
            next.delete(itemKey);
        } else {
            next.add(itemKey);
        }
        setSelectedItems(next);
    };

    const toggleAll = () => {
        if (allSelected) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(cartItems.map((item) => getCartKey(item))));
        }
    };

    const toggleSupplierGroup = (groupItems) => {
        const groupKeys = groupItems.map((it) => getCartKey(it));
        const allGroupSelected = groupKeys.every((k) => selectedItems.has(k));
        const next = new Set(selectedItems);

        if (allGroupSelected) {
            groupKeys.forEach((k) => next.delete(k));
        } else {
            groupKeys.forEach((k) => next.add(k));
        }
        setSelectedItems(next);
    };

    const updateQuantity = (item, newQty) => {
        const minAllowed = 1;
        if (newQty < minAllowed) return;

        const cartKey = getCartKey(item);
        setUpdatingId(cartKey);

        router.patch(route('cart.update'), { 
            id: item.id, 
            cart_key: item.cart_key,
            qty: newQty 
        }, {
            preserveScroll: true,
            onFinish: () => setUpdatingId(null),
            onError: () => addToast('Could not update quantity.', 'error'),
        });
    };

    const removeItem = (item) => {
        const cartKey = getCartKey(item);
        setRemovingId(cartKey);

        router.delete(route('cart.destroy'), {
            data: { id: item.id, cart_key: item.cart_key },
            preserveScroll: true,
            onSuccess: () => {
                const next = new Set(selectedItems);
                next.delete(cartKey);
                setSelectedItems(next);
                addToast(`Removed ${item.name} from cart.`, 'success');
            },
            onFinish: () => setRemovingId(null),
        });
    };

    const proceedToCheckout = () => {
        if (selectedCartItems.length === 0) {
            addToast('Please select at least one material to order.', 'error');
            return;
        }

        const selectedKeys = Array.from(selectedItems);
        router.get(route('seller.supply-hub.checkout'), {
            items: selectedKeys,
        });
    };

    return (
        <>
            <Head title="Material Sourcing Cart - Supply Hub" />
            <SellerHeader
                title="Supply Hub"
                subtitle="Source bulk raw materials, clay sacks, timber, and glazes directly from verified peer studios."
                onMenuClick={openSidebar}
                badge={{ label: 'Wholesale Sourcing', iconColor: 'text-clay-500' }}
            />

            <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 pb-28 sm:pb-8">
                
                {/* Top Navigation Tabs & Quick Icons */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-stone-200 pb-3">
                    <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1 sm:pb-0">
                        <Link
                            href={route('seller.supply-hub.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs shrink-0"
                        >
                            <Store size={13} className="text-clay-600" />
                            <span>Browse Peer Supplies</span>
                        </Link>

                        <Link
                            href={route('seller.supply-hub.my-listings')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs shrink-0"
                        >
                            <Layers size={13} className="text-clay-600" />
                            <span>My Wholesale Listings</span>
                            {myPublishedCount > 0 && (
                                <span className="rounded-full bg-clay-100 text-clay-700 px-1.5 py-0.2 text-[10px] font-extrabold">
                                    {myPublishedCount}
                                </span>
                            )}
                        </Link>

                        <Link
                            href={route('seller.supply-hub.orders')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3.5 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs shrink-0"
                        >
                            <Truck size={13} className="text-clay-600" />
                            <span>Inbound Material Orders</span>
                            {activeOrdersCount > 0 && (
                                <span className="rounded-full bg-clay-600 text-white px-1.5 py-0.2 text-[10px] font-black">
                                    {activeOrdersCount}
                                </span>
                            )}
                        </Link>
                    </div>

                    {/* Quick Icon Shortcuts */}
                    <div className="flex items-center gap-2 shrink-0">
                        <Link
                            href={route('procurement.index')}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs"
                            title="Studio Inventory"
                        >
                            <Boxes size={14} className="text-stone-500" />
                            <span className="hidden md:inline">Studio Inventory</span>
                        </Link>

                        <Link
                            href={route('seller.supply-hub.cart')}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-stone-900 px-3.5 py-2 text-xs font-bold text-white shadow-2xs"
                            title="View Sourcing Cart"
                        >
                            <ShoppingCart size={14} className="text-clay-400" />
                            <span className="hidden md:inline">View Cart</span>
                            {cartItems.length > 0 && (
                                <span className="rounded-full bg-clay-600 text-white px-1.5 py-0.2 text-[10px] font-black">
                                    {cartItems.length}
                                </span>
                            )}
                        </Link>
                    </div>
                </div>

                {cartItems.length === 0 ? (
                    <div className="rounded-2xl border border-stone-200 bg-white p-12 text-center shadow-xs">
                        <WorkspaceEmptyState
                            icon={Package}
                            title="Your sourcing cart is empty"
                            description="Browse materials, raw clay, glazes, timber, and packaging from verified artisan peer studios."
                            actionLabel="Browse Peer Supplies"
                            onAction={() => router.get(route('seller.supply-hub.index'))}
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                        
                        {/* Left: Cart Items by Supplier */}
                        <div className="lg:col-span-8 space-y-6">
                            
                            {/* Global Select Bar */}
                            <div className="flex items-center justify-between bg-white rounded-2xl border border-stone-200 px-5 py-3.5 shadow-2xs">
                                <label className="flex items-center gap-3 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={toggleAll}
                                        className="h-4 w-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                    />
                                    <span className="text-xs font-bold text-stone-900">
                                        Select All Materials ({cartItems.length} items)
                                    </span>
                                </label>

                                <span className="text-xs text-stone-500">
                                    {selectedCartItems.length} of {cartItems.length} selected
                                </span>
                            </div>

                            {/* Supplier Groups */}
                            {groupedBySupplier.map((group) => {
                                const groupKeys = group.items.map((it) => getCartKey(it));
                                const isGroupSelected = groupKeys.every((k) => selectedItems.has(k));

                                return (
                                    <div 
                                        key={group.supplierId}
                                        className="bg-white rounded-2xl border border-stone-200 shadow-2xs overflow-hidden"
                                    >
                                        {/* Supplier Header */}
                                        <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-50/80 px-5 py-3.5 border-b border-stone-200">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isGroupSelected}
                                                    onChange={() => toggleSupplierGroup(group.items)}
                                                    className="h-4 w-4 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <Store size={15} className="text-clay-600 shrink-0" />
                                                    <span className="text-xs font-black text-stone-900">
                                                        {group.supplierName}
                                                    </span>
                                                </div>
                                            </div>

                                            <Link
                                                href={route('chat.index', { user_id: group.supplierId })}
                                                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-stone-200 rounded-xl text-[11px] font-bold text-stone-700 hover:bg-stone-100 transition-colors shadow-2xs"
                                                title="Chat with supplier workshop"
                                            >
                                                <MessageSquare size={13} className="text-stone-500" />
                                                <span>Message Studio</span>
                                            </Link>
                                        </div>

                                        {/* Items List */}
                                        <div className="divide-y divide-stone-100">
                                            {group.items.map((item) => {
                                                const itemKey = getCartKey(item);
                                                const isSelected = selectedItems.has(itemKey);
                                                const qty = Number(item.qty || 1);
                                                const moq = Number(item.moq || 1);
                                                const hasWholesaleTier = Boolean(item.wholesale_price && item.wholesale_min_qty);
                                                const isWholesaleActive = hasWholesaleTier && qty >= Number(item.wholesale_min_qty);
                                                const effectiveUnitCost = isWholesaleActive
                                                    ? Number(item.wholesale_price)
                                                    : Number(item.effective_price || item.price || 0);
                                                const lineTotal = effectiveUnitCost * qty;
                                                const isBelowMoq = qty < moq;

                                                return (
                                                    <div 
                                                        key={itemKey}
                                                        className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-stone-50/40 transition-colors"
                                                    >
                                                        {/* Checkbox + Image + Details */}
                                                        <div className="flex items-start gap-3.5 min-w-0 flex-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleItem(itemKey)}
                                                                className="h-4 w-4 mt-1 rounded border-stone-300 text-clay-600 focus:ring-clay-500 cursor-pointer shrink-0"
                                                            />

                                                            <div className="w-16 h-16 rounded-xl bg-stone-100 border border-stone-200/80 overflow-hidden flex items-center justify-center shrink-0">
                                                                {item.img ? (
                                                                    <img 
                                                                        src={item.img} 
                                                                        alt={item.name} 
                                                                        className="w-full h-full object-cover" 
                                                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                                                    />
                                                                ) : (
                                                                    <Package size={22} className="text-stone-400" />
                                                                )}
                                                            </div>

                                                            <div className="min-w-0 flex-1 space-y-1">
                                                                <div className="flex items-center gap-2 flex-wrap">
                                                                    <span className="text-sm font-bold text-stone-900">
                                                                        {item.name}
                                                                    </span>
                                                                    {item.supply_unit && (
                                                                        <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 text-[10px] font-bold">
                                                                            Per {item.supply_unit}
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Pricing & Tier Alert */}
                                                                <div className="flex items-center gap-2 flex-wrap text-xs">
                                                                    <span className="font-bold text-clay-700">
                                                                        {formatCurrency(effectiveUnitCost)}
                                                                    </span>
                                                                    {isWholesaleActive && (
                                                                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                                                                            Bulk Price Applied
                                                                        </span>
                                                                    )}
                                                                    {hasWholesaleTier && !isWholesaleActive && (
                                                                        <span className="text-[11px] text-stone-500">
                                                                            (Order {item.wholesale_min_qty}+ for {formatCurrency(item.wholesale_price)} each)
                                                                        </span>
                                                                    )}
                                                                </div>

                                                                {/* Minimum Order Warning */}
                                                                {isBelowMoq && (
                                                                    <div className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                                                        <AlertTriangle size={11} />
                                                                        <span>Minimum order is {moq} {item.supply_unit || 'units'}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Quantity Controller + Total + Delete */}
                                                        <div className="flex items-center justify-between sm:justify-end gap-5 w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
                                                            {/* Stepper */}
                                                            <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-stone-50/50">
                                                                <button
                                                                    type="button"
                                                                    disabled={qty <= 1 || updatingId === itemKey}
                                                                    onClick={() => updateQuantity(item, qty - 1)}
                                                                    className="p-2 text-stone-600 hover:bg-stone-200/60 disabled:opacity-30 disabled:cursor-not-allowed transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer"
                                                                >
                                                                    <Minus size={13} />
                                                                </button>
                                                                <span className="px-3 text-xs font-bold text-stone-900 min-w-[32px] text-center">
                                                                    {qty}
                                                                </span>
                                                                <button
                                                                    type="button"
                                                                    disabled={updatingId === itemKey}
                                                                    onClick={() => updateQuantity(item, qty + 1)}
                                                                    className="p-2 text-stone-600 hover:bg-stone-200/60 transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer"
                                                                >
                                                                    <Plus size={13} />
                                                                </button>
                                                            </div>

                                                            {/* Line Total */}
                                                            <div className="text-right min-w-[80px]">
                                                                <span className="text-sm font-black text-stone-900 block">
                                                                    {formatCurrency(lineTotal)}
                                                                </span>
                                                                <span className="text-[10px] text-stone-400 font-mono">
                                                                    {Math.round((item.weight || 1.0) * qty * 10) / 10} kg
                                                                </span>
                                                            </div>

                                                            {/* Remove */}
                                                            <button
                                                                type="button"
                                                                disabled={removingId === itemKey}
                                                                onClick={() => removeItem(item)}
                                                                className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors min-w-[34px] min-h-[34px] flex items-center justify-center cursor-pointer"
                                                                title="Remove item"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Right: Order Summary Sidebar (Desktop) */}
                        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
                            <div className="bg-white rounded-2xl border border-stone-200 p-6 shadow-2xs space-y-5">
                                <h2 className="text-sm font-black uppercase tracking-wider text-stone-900">
                                    Order Summary
                                </h2>

                                <div className="space-y-3 text-xs text-stone-600">
                                    <div className="flex justify-between">
                                        <span>Materials Subtotal ({totalCount} items)</span>
                                        <span className="font-bold text-stone-900">{formatCurrency(merchandiseSubtotal)}</span>
                                    </div>

                                    <div className="flex justify-between">
                                        <span>Platform Convenience Fee (4%)</span>
                                        <span className="font-bold text-stone-900">{formatCurrency(platformFee)}</span>
                                    </div>

                                    <div className="flex justify-between pt-2 border-t border-stone-100">
                                        <span className="text-stone-500">Estimated Total Weight</span>
                                        <span className="font-mono font-bold text-stone-700">{totalWeight} kg</span>
                                    </div>

                                    <div className="rounded-xl bg-stone-50 border border-stone-200 p-3 space-y-1">
                                        <div className="flex items-center gap-1.5 text-[11px] font-bold text-stone-700">
                                            <Truck size={13} className="text-clay-600" />
                                            <span>Courier Vehicle: {recommendedVehicle}</span>
                                        </div>
                                        <p className="text-[10px] text-stone-500 leading-tight">
                                            Shipping fees are calculated based on workshop address at checkout.
                                        </p>
                                    </div>
                                </div>

                                <div className="pt-4 border-t border-stone-200 flex justify-between items-baseline">
                                    <span className="text-sm font-black text-stone-900">Total Due</span>
                                    <span className="text-xl font-black text-clay-700">{formatCurrency(grandTotal)}</span>
                                </div>

                                <button
                                    type="button"
                                    onClick={proceedToCheckout}
                                    disabled={selectedCartItems.length === 0}
                                    className="w-full flex items-center justify-center gap-2 bg-clay-600 text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-clay-700 active:scale-98 transition-all shadow-md shadow-clay-600/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    <span>Proceed to Material Checkout</span>
                                    <ArrowRight size={14} />
                                </button>
                            </div>

                            {/* Restock Guarantee Note */}
                            <div className="rounded-2xl border border-stone-200/80 bg-stone-50/80 p-4 text-xs text-stone-600 space-y-1.5">
                                <div className="flex items-center gap-1.5 font-bold text-stone-900">
                                    <ShieldCheck size={14} className="text-emerald-600" />
                                    <span>Automatic Workshop Restock</span>
                                </div>
                                <p className="text-[11px] text-stone-500 leading-relaxed">
                                    Delivered supplies automatically sync into your Studio Materials Inventory with weighted-average unit costing upon delivery confirmation.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mobile Sticky Bottom Checkout Bar (/propose-mobile-ui-ux) */}
            {cartItems.length > 0 && (
                <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-stone-200 px-4 py-3 shadow-lg flex items-center justify-between gap-3">
                    <div className="min-w-0">
                        <span className="text-[10px] uppercase font-bold text-stone-400 block">Total Due</span>
                        <span className="text-base font-black text-clay-700 truncate block">
                            {formatCurrency(grandTotal)}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={proceedToCheckout}
                        disabled={selectedCartItems.length === 0}
                        className="flex-1 max-w-[240px] flex items-center justify-center gap-1.5 bg-clay-600 text-white min-h-[44px] px-4 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-clay-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span>Checkout ({selectedCartItems.length})</span>
                        <ArrowRight size={13} />
                    </button>
                </div>
            )}
        </>
    );
}

SourcingCart.layout = (page) => <SellerWorkspaceLayout active="supply-hub">{page}</SellerWorkspaceLayout>;
