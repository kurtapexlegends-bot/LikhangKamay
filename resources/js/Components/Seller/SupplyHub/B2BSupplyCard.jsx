import React from 'react';
import { 
    Store, ShieldCheck, MapPin, Plus, Minus, 
    ShoppingCart, ArrowUpRight, Bike, Car, Truck, Tag, Percent
} from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function B2BSupplyCard({
    item,
    quantity,
    onQuantityChange,
    onAddToCart,
    onQuickOrder,
}) {
    const qty = quantity || item.moq || 1;
    const hasDiscount = item.wholesale_price && item.wholesale_min_qty && qty >= item.wholesale_min_qty;
    const unitPrice = hasDiscount ? item.wholesale_price : item.effective_price;
    const subtotal = unitPrice * qty;
    const totalWeight = Math.round((qty * (item.weight || 1.0) * 1.10) * 10) / 10;

    const discountPercentage = (item.wholesale_price && item.effective_price)
        ? Math.round(((item.effective_price - item.wholesale_price) / item.effective_price) * 100)
        : null;

    return (
        <div className="group bg-white rounded-2xl border border-stone-200 shadow-2xs hover:shadow-md hover:border-stone-300 transition-all duration-200 flex flex-col overflow-hidden">
            {/* Image Container with Hover Zoom */}
            <div className="aspect-4/3 relative overflow-hidden bg-stone-100 border-b border-stone-150">
                <img
                    loading="lazy"
                    src={item.img || '/images/placeholder.svg'}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                />

                {/* Top Left Badges: MOQ & Unit Weight */}
                <div className="absolute top-2.5 left-2.5 z-10 flex flex-wrap gap-1.5">
                    <span className="bg-stone-900/85 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-2xs uppercase tracking-wider">
                        MOQ: {item.moq} {item.supply_unit}
                    </span>
                    <span className="bg-white/90 backdrop-blur-xs text-stone-800 text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-2xs border border-stone-200/60">
                        {item.weight} kg/{item.supply_unit}
                    </span>
                </div>

                {/* Top Right Badges: Bulk Savings */}
                {discountPercentage && discountPercentage > 0 && (
                    <span className="absolute top-2.5 right-2.5 z-10 bg-emerald-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-lg shadow-2xs uppercase tracking-wider flex items-center gap-1">
                        <Percent size={10} /> -{discountPercentage}% Bulk
                    </span>
                )}
            </div>

            {/* Body */}
            <div className="p-4 flex flex-col flex-1 justify-between space-y-3">
                <div className="space-y-1.5">
                    {/* Studio Attribution */}
                    <div className="flex items-center justify-between gap-1.5 text-[11px] text-stone-500">
                        <div className="flex items-center gap-1 min-w-0 font-medium">
                            <Store size={11} className="text-clay-600 shrink-0" />
                            <span className="truncate font-semibold text-stone-800">{item.seller.shop_name}</span>
                            {item.seller.is_verified && (
                                <ShieldCheck size={11} className="text-blue-600 shrink-0" />
                            )}
                        </div>
                        <span className="flex items-center gap-0.5 text-stone-400 shrink-0">
                            <MapPin size={10} />
                            {item.seller.city}
                        </span>
                    </div>

                    {/* Material Title & Category */}
                    <div>
                        <h3 className="font-bold text-stone-900 text-xs line-clamp-1 leading-snug group-hover:text-clay-700 transition-colors">
                            {item.name}
                        </h3>
                        <span className="inline-flex items-center rounded-md bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500 mt-1">
                            {item.category}
                        </span>
                    </div>

                    {/* Pricing Block */}
                    <div className="pt-1.5 flex items-baseline justify-between">
                        <div>
                            <span className="text-sm font-extrabold text-stone-900">
                                {formatCurrency(item.effective_price)}
                            </span>
                            <span className="text-[10px] text-stone-400 ml-0.5">/{item.supply_unit}</span>
                        </div>
                        {item.wholesale_price && item.wholesale_min_qty && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                                hasDiscount ? 'bg-emerald-100 text-emerald-800' : 'bg-stone-100 text-stone-600'
                            }`}>
                                {formatCurrency(item.wholesale_price)} ({item.wholesale_min_qty}+)
                            </span>
                        )}
                    </div>

                    {/* Courier Estimation Pill */}
                    <div className="rounded-lg bg-stone-50 border border-stone-150 px-2.5 py-1 text-[10px] text-stone-600 flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium">
                            {totalWeight > 200 ? (
                                <Truck size={12} className="text-clay-600" />
                            ) : totalWeight > 20 ? (
                                <Car size={12} className="text-amber-600" />
                            ) : (
                                <Bike size={12} className="text-stone-500" />
                            )}
                            <span>{item.vehicle_preview.label}</span>
                        </span>
                        <span className="font-bold text-stone-700">{totalWeight} kg</span>
                    </div>
                </div>

                {/* Stepper & Action Buttons */}
                <div className="pt-2 border-t border-stone-150 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-stone-500 font-medium">Order Qty:</span>
                        <div className="flex items-center rounded-lg border border-stone-200 bg-white">
                            <button
                                type="button"
                                onClick={() => onQuantityChange(item, qty - 1)}
                                disabled={qty <= (item.moq || 1)}
                                className="px-2 py-1 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Decrease quantity"
                            >
                                <Minus size={11} />
                            </button>
                            <span className="px-2 text-xs font-bold text-stone-900 w-7 text-center">{qty}</span>
                            <button
                                type="button"
                                onClick={() => onQuantityChange(item, qty + 1)}
                                disabled={qty >= item.stock}
                                className="px-2 py-1 text-stone-600 hover:bg-stone-50 disabled:opacity-30 disabled:cursor-not-allowed"
                                aria-label="Increase quantity"
                            >
                                <Plus size={11} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <button
                            type="button"
                            onClick={() => onAddToCart(item, qty)}
                            className="flex items-center justify-center gap-1 rounded-xl border border-stone-200 bg-stone-50 py-2 text-xs font-bold text-stone-700 hover:bg-stone-100 hover:border-stone-300 transition-colors shadow-2xs"
                            title="Add to Procurement Cart"
                        >
                            <ShoppingCart size={13} />
                            <span>Cart</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => onQuickOrder(item, qty)}
                            className="flex items-center justify-center gap-1 rounded-xl bg-clay-600 py-2 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors"
                        >
                            <span>Buy</span>
                            <ArrowUpRight size={13} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
