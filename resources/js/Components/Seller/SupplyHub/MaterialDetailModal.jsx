import React, { useState, useEffect } from 'react';
import { Link, router } from '@inertiajs/react';
import Modal from '@/Components/Modal';
import { 
    X, Store, ShieldCheck, MapPin, Plus, Minus, 
    ShoppingCart, ArrowUpRight, Bike, Car, Truck, Tag, Percent, Package, CheckCircle2, MessageSquare
} from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function MaterialDetailModal({
    show,
    onClose,
    supply,
    item: propItem,
    quantity: controlledQuantity,
    onQuantityChange,
    onAddToCart,
    onQuickOrder,
}) {
    const item = supply || propItem;
    const minOrderQty = Math.max(1, Number(item?.moq) || 1);
    const [localQty, setLocalQty] = useState(minOrderQty);

    useEffect(() => {
        if (item) {
            setLocalQty(Math.max(1, Number(item.moq) || 1));
        }
    }, [item]);

    if (!item) return null;

    const isModalOpen = show !== undefined ? show : !!item;
    const qty = controlledQuantity !== undefined ? controlledQuantity : localQty;

    const handleQtyChange = (newQty) => {
        const validated = Math.max(minOrderQty, Math.min(Number(item.stock) || 9999, newQty));
        if (onQuantityChange) {
            onQuantityChange(item, validated);
        } else {
            setLocalQty(validated);
        }
    };

    const handleQuickOrder = () => {
        if (onQuickOrder) {
            onQuickOrder(item, qty);
        } else if (onAddToCart) {
            onAddToCart(item, qty);
            router.visit(route('seller.supply-hub.cart'));
        }
        if (onClose) onClose();
    };

    const hasDiscount = item.wholesale_price && item.wholesale_min_qty && qty >= item.wholesale_min_qty;
    const unitPrice = hasDiscount ? Number(item.wholesale_price) : Number(item.effective_price || item.price || 0);
    const subtotal = unitPrice * qty;
    const totalWeight = Math.round((qty * (Number(item.weight) || 1.0) * 1.10) * 10) / 10;

    const vehicleLabel = totalWeight > 300
        ? 'Large Van 1000kg'
        : totalWeight > 200
            ? 'MPV 300kg'
            : totalWeight > 20
                ? '4-Wheel Sedan'
                : 'Motorcycle';

    const discountPercentage = (item.wholesale_price && (item.effective_price || item.price))
        ? Math.round((((item.effective_price || item.price) - item.wholesale_price) / (item.effective_price || item.price)) * 100)
        : null;

    const sellerName = item.seller?.shop_name || item.seller?.name || item.shop_name || 'Artisan Workshop';
    const sellerCity = item.seller?.city || item.city || 'Cavite';
    const isSellerVerified = item.seller?.is_verified ?? true;

    return (
        <Modal show={isModalOpen} onClose={onClose} maxWidth="2xl">
            <div className="bg-white rounded-2xl overflow-hidden text-xs flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-stone-150 shrink-0">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="rounded-lg bg-clay-100 text-clay-700 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shrink-0">
                            {item.category}
                        </span>
                        <h3 className="font-bold text-stone-900 text-sm truncate">{item.name}</h3>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700 transition-colors cursor-pointer"
                        aria-label="Close dialog"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Content Grid */}
                <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-start overflow-y-auto custom-scrollbar flex-1">
                    {/* Left: Image & Studio Metadata */}
                    <div className="space-y-4">
                        <div className="aspect-4/3 rounded-2xl overflow-hidden bg-stone-100 border border-stone-200 shadow-2xs">
                            <img
                                src={item.img || '/images/placeholder.svg'}
                                alt={item.name}
                                className="h-full w-full object-cover"
                                onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                            />
                        </div>

                        {/* Supplier Card */}
                        <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 space-y-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-bold text-stone-800">
                                    <Store size={14} className="text-clay-600" />
                                    <span>{sellerName}</span>
                                    {isSellerVerified && (
                                        <ShieldCheck size={13} className="text-blue-600" />
                                    )}
                                </div>
                                <span className="flex items-center gap-1 text-[11px] text-stone-500 font-medium">
                                    <MapPin size={11} className="text-stone-400" />
                                    {sellerCity}
                                </span>
                            </div>
                            <p className="text-[11px] text-stone-500 font-medium leading-relaxed">
                                Verified workshop supplier. Orders dispatched directly from artisan warehouse.
                            </p>
                        </div>
                    </div>

                    {/* Right: Details & Order Stepper */}
                    <div className="space-y-4">
                        <div>
                            <span className="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Unit Price</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-black text-stone-900">{formatCurrency(unitPrice)}</span>
                                <span className="text-stone-500 font-semibold text-xs">/ {item.supply_unit || 'pcs'}</span>
                                {discountPercentage && discountPercentage > 0 && (
                                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-1.5 py-0.5 rounded-md">
                                        Save {discountPercentage}% Bulk
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Wholesale Tier Highlight */}
                        {item.wholesale_price && item.wholesale_min_qty && (
                            <div className={`p-3 rounded-xl border space-y-1 ${
                                hasDiscount ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-stone-50 border-stone-200 text-stone-700'
                            }`}>
                                <div className="flex items-center justify-between font-bold text-xs">
                                    <span className="flex items-center gap-1">
                                        <Tag size={13} />
                                        <span>Volume Tier: {item.wholesale_min_qty}+ {item.supply_unit || 'units'}</span>
                                    </span>
                                    <span className="font-extrabold">{formatCurrency(item.wholesale_price)} / unit</span>
                                </div>
                                <p className="text-[11px] opacity-80">
                                    {hasDiscount ? 'Wholesale rate active for this order quantity.' : `Add ${Math.max(0, item.wholesale_min_qty - qty)} more units to unlock wholesale bulk rate.`}
                                </p>
                            </div>
                        )}

                        {/* Description */}
                        {item.description && (
                            <div className="space-y-1">
                                <span className="text-stone-400 text-[10px] uppercase font-bold tracking-wider">Material Specifications</span>
                                <p className="text-stone-600 text-xs leading-relaxed font-medium">
                                    {item.description}
                                </p>
                            </div>
                        )}

                        {/* Logistics Specs */}
                        <div className="space-y-2 pt-2 border-t border-stone-150">
                            <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                                    <span className="text-stone-400 font-bold block text-[10px]">Min. Order Quantity</span>
                                    <span className="font-extrabold text-stone-800">{minOrderQty} {item.supply_unit || 'pcs'}</span>
                                </div>
                                <div className="bg-stone-50 p-2.5 rounded-xl border border-stone-150">
                                    <span className="text-stone-400 font-bold block text-[10px]">Available In Stock</span>
                                    <span className="font-extrabold text-stone-800">{item.stock || 0} {item.supply_unit || 'pcs'}</span>
                                </div>
                            </div>

                            {/* Vehicle Sizing Preview */}
                            <div className="bg-stone-50/80 p-2.5 rounded-xl border border-stone-150 flex items-center justify-between">
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
                                <div className="flex items-center rounded-xl border border-stone-200 bg-white shadow-2xs">
                                    <button
                                        type="button"
                                        onClick={() => handleQtyChange(qty - 1)}
                                        disabled={qty <= minOrderQty}
                                        className="px-3 py-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-30 cursor-pointer"
                                        aria-label="Decrease quantity"
                                    >
                                        <Minus size={13} />
                                    </button>
                                    <span className="px-3 text-xs font-bold text-stone-900 w-8 text-center">{qty}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleQtyChange(qty + 1)}
                                        disabled={qty >= (Number(item.stock) || 9999)}
                                        className="px-3 py-1.5 text-stone-600 hover:bg-stone-50 disabled:opacity-30 cursor-pointer"
                                        aria-label="Increase quantity"
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
                                        if (onAddToCart) onAddToCart(item, qty);
                                        if (onClose) onClose();
                                    }}
                                    className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-white py-2.5 text-xs font-bold text-stone-800 hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
                                >
                                    <ShoppingCart size={14} />
                                    <span>Add to Cart</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={handleQuickOrder}
                                    className="flex items-center justify-center gap-1 rounded-xl bg-clay-600 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors cursor-pointer"
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
