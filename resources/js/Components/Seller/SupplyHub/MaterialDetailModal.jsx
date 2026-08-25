import React, { useState } from 'react';
import { Link } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { 
    X, Store, ShieldCheck, MapPin, Plus, Minus, 
    ShoppingCart, ArrowUpRight, Bike, Car, Truck, Tag, Percent, Package, CheckCircle2, MessageSquare
} from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MaterialDetailModal({
    show = false,
    onClose,
    item,
    quantity,
    onQuantityChange,
    onAddToCart,
    onQuickOrder,
}) {
    if (!item) return null;

    const qty = quantity || item.moq || 1;
    const hasDiscount = item.wholesale_price && item.wholesale_min_qty && qty >= item.wholesale_min_qty;
    const unitPrice = hasDiscount ? item.wholesale_price : item.effective_price;
    const subtotal = unitPrice * qty;
    const totalWeight = Math.round((qty * (item.weight || 1.0) * 1.10) * 10) / 10;

    const vehicleLabel = totalWeight > 300
        ? 'Large Van 1000kg'
        : totalWeight > 200
            ? 'MPV 300kg'
            : totalWeight > 20
                ? '4-Wheel Sedan'
                : 'Motorcycle';

    const discountPercentage = (item.wholesale_price && item.effective_price)
        ? Math.round(((item.effective_price - item.wholesale_price) / item.effective_price) * 100)
        : null;

    return (
        <Modal show={show} onClose={onClose} maxWidth="2xl">
            <div className="bg-white rounded-2xl overflow-hidden text-xs">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-150">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="rounded-lg bg-clay-100 text-clay-700 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider">
                            {item.category}
                        </span>
                        <h3 className="font-bold text-stone-900 text-sm truncate">{item.name}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content Grid */}
                <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Image & Supplier Workshop */}
                    <div className="space-y-4">
                        <div className="aspect-4/3 rounded-xl overflow-hidden bg-stone-100 border border-stone-200 relative">
                            <img
                                src={item.img || '/images/placeholder.svg'}
                                alt={item.name}
                                className="h-full w-full object-cover"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                            />
                            {discountPercentage && discountPercentage > 0 && (
                                <span className="absolute top-2.5 right-2.5 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-2xs">
                                    -{discountPercentage}% Bulk Discount
                                </span>
                            )}
                        </div>

                        {/* Supplier Workshop Card */}
                        <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-3.5 space-y-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Supplier Studio:</span>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-stone-900">
                                    <Store size={14} className="text-clay-600" />
                                    <span>{item.seller.shop_name}</span>
                                    {item.seller.is_verified && (
                                        <ShieldCheck size={14} className="text-blue-600" />
                                    )}
                                </div>
                                <span className="text-stone-500 text-[11px] flex items-center gap-0.5">
                                    <MapPin size={11} />
                                    {item.seller.city}
                                </span>
                            </div>
                            
                            <Link
                                href={route('chat.index', { user_id: item.seller?.id || item.user_id })}
                                className="inline-flex items-center justify-center gap-1.5 w-full bg-white hover:bg-stone-100 border border-stone-200 rounded-xl py-2 text-[11px] font-bold text-stone-700 transition-colors shadow-2xs"
                            >
                                <MessageSquare size={13} className="text-stone-500" />
                                <span>Message Supplier Studio</span>
                            </Link>
                        </div>
                    </div>

                    {/* Right: Specifications & Order Config */}
                    <div className="space-y-4 flex flex-col justify-between">
                        <div className="space-y-3.5">
                            <div>
                                <h4 className="font-bold text-stone-900 text-sm">{item.name}</h4>
                                <p className="text-stone-500 text-xs mt-1 leading-relaxed">
                                    {item.description || 'Surplus artisan material harvested and processed for professional studio crafting.'}
                                </p>
                            </div>

                            {/* Spec Badges */}
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Minimum Order (MOQ)</span>
                                    <span className="font-extrabold text-stone-900">{item.moq} {item.supply_unit}</span>
                                </div>
                                <div className="rounded-xl border border-stone-200 bg-stone-50 p-2.5">
                                    <span className="text-stone-400 block text-[10px] font-bold uppercase">Unit Weight</span>
                                    <span className="font-extrabold text-stone-900">{item.weight} kg / {item.supply_unit}</span>
                                </div>
                            </div>

                            {/* Pricing & Bulk Tier Table */}
                            <div className="rounded-xl border border-stone-200 bg-white overflow-hidden">
                                <div className="bg-stone-50 px-3 py-2 border-b border-stone-150 flex items-center justify-between text-[11px] font-bold text-stone-700">
                                    <span>Wholesale Pricing Structure</span>
                                    <span>Available: {item.stock} {item.supply_unit}</span>
                                </div>
                                <div className="p-3 space-y-1.5 text-xs">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-stone-600">Standard Rate (MOQ {item.moq}+):</span>
                                        <span className="font-bold text-stone-900">{formatCurrency(item.effective_price)} / {item.supply_unit}</span>
                                    </div>
                                    {item.wholesale_price && item.wholesale_min_qty && (
                                        <div className={`flex justify-between items-baseline pt-1 border-t border-stone-100 ${hasDiscount ? 'text-emerald-700 font-bold' : 'text-stone-600'}`}>
                                            <span>Volume Tier ({item.wholesale_min_qty}+ {item.supply_unit}):</span>
                                            <span>{formatCurrency(item.wholesale_price)} / {item.supply_unit}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dynamic Vehicle Indicator */}
                            <div className="rounded-xl bg-stone-150/70 p-3 text-[11px] text-stone-700 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    {totalWeight > 200 ? (
                                        <Truck size={15} className="text-clay-600" />
                                    ) : totalWeight > 20 ? (
                                        <Car size={15} className="text-amber-600" />
                                    ) : (
                                        <Bike size={15} className="text-stone-600" />
                                    )}
                                    <div>
                                        <span className="font-bold text-stone-900 block">{vehicleLabel}</span>
                                        <span className="text-[10px] text-stone-500">Auto-allocated based on total weight</span>
                                    </div>
                                </div>
                                <span className="font-mono font-bold text-xs text-stone-900">{totalWeight} kg</span>
                            </div>
                        </div>

                        {/* Order Stepper & Total */}
                        <div className="space-y-3 pt-3 border-t border-stone-150">
                            <div className="flex items-center justify-between">
                                <span className="font-bold text-stone-700">Select Quantity:</span>
                                <div className="flex items-center rounded-xl border border-stone-200 bg-white">
                                    <button
                                        type="button"
                                        onClick={() => onQuantityChange(item, qty - 1)}
                                        disabled={qty <= (item.moq || 1)}
                                        className="px-3 py-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                                    >
                                        <Minus size={13} />
                                    </button>
                                    <span className="px-3 text-xs font-bold text-stone-900 w-8 text-center">{qty}</span>
                                    <button
                                        type="button"
                                        onClick={() => onQuantityChange(item, qty + 1)}
                                        disabled={qty >= item.stock}
                                        className="px-3 py-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-30"
                                    >
                                        <Plus size={13} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-baseline justify-between bg-stone-50 p-3 rounded-xl border border-stone-200">
                                <div>
                                    <span className="text-stone-500 font-medium block">Total Estimate:</span>
                                    {hasDiscount && (
                                        <span className="text-[10px] text-emerald-700 font-bold">Volume discount applied!</span>
                                    )}
                                </div>
                                <span className="text-base font-black text-clay-700">{formatCurrency(subtotal)}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        onAddToCart(item, qty);
                                        onClose();
                                    }}
                                    className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-800 hover:bg-stone-50 transition-colors shadow-2xs"
                                >
                                    <ShoppingCart size={14} />
                                    <span>Add to Cart</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        onQuickOrder(item, qty);
                                        onClose();
                                    }}
                                    className="flex items-center justify-center gap-1 rounded-xl bg-clay-600 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors"
                                >
                                    <span>Order Now</span>
                                    <ArrowUpRight size={14} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}
