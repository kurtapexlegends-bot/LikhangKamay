import React from 'react';
import { 
    Store, ShieldCheck, MapPin, Plus, Minus, 
    ShoppingCart, ArrowUpRight, Bike, Car, Truck, Percent, Eye 
} from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function B2BSupplyCard({
    item,
    quantity,
    onQuantityChange,
    onAddToCart,
    onQuickOrder,
    onOpenDetail,
}) {
    const qty = quantity || item.moq || 1;
    const hasDiscount = item.wholesale_price && item.wholesale_min_qty && qty >= item.wholesale_min_qty;
    const unitPrice = hasDiscount ? item.wholesale_price : item.effective_price;
    const totalWeight = Math.round((qty * (item.weight || 1.0) * 1.10) * 10) / 10;

    const discountPercentage = (item.wholesale_price && item.effective_price)
        ? Math.round(((item.effective_price - item.wholesale_price) / item.effective_price) * 100)
        : null;

    // Real-time dynamic vehicle calculation based on active quantity
    const vehicleLabel = totalWeight > 300
        ? 'Large Van'
        : totalWeight > 200
            ? 'MPV'
            : totalWeight > 20
                ? 'Sedan'
                : 'Motorcycle';

    return (
        <div className="group bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-stone-300 transition-all duration-200 flex flex-col overflow-hidden">
            {/* Image Container with Hover Zoom & Click to View */}
            <div 
                onClick={() => onOpenDetail && onOpenDetail(item)}
                className="aspect-4/3 relative overflow-hidden bg-stone-100 border-b border-stone-150 cursor-pointer"
            >
                <img
                    loading="lazy"
                    src={item.img || '/images/placeholder.svg'}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                />

                {/* Top Badges */}
                <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none gap-1">
                    <span className="bg-stone-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-2xs">
                        Min. {item.moq} {item.supply_unit}
                    </span>

                    {discountPercentage && discountPercentage > 0 && (
                        <span className="bg-emerald-600 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shadow-2xs flex items-center gap-0.5">
                            <Percent size={9} /> -{discountPercentage}% Bulk
                        </span>
                    )}
                </div>

                {/* Quick View Hover Pill */}
                <div className="absolute inset-0 bg-stone-900/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                    <span className="bg-white/95 text-stone-900 text-[11px] font-bold px-3 py-1.5 rounded-xl shadow-md flex items-center gap-1.5">
                        <Eye size={13} className="text-clay-600" /> View Details
                    </span>
                </div>
            </div>

            {/* Body */}
            <div className="p-3 sm:p-3.5 flex flex-col flex-1 justify-between space-y-2.5">
                <div className="space-y-1.5">
                    {/* Studio Attribution & City */}
                    <div className="flex items-center justify-between gap-1 text-[11px] text-stone-500">
                        <div className="flex items-center gap-1 min-w-0 font-medium">
                            <Store size={11} className="text-clay-600 shrink-0" />
                            <span className="truncate font-semibold text-stone-800">{item.seller.shop_name}</span>
                            {item.seller.is_verified && (
                                <ShieldCheck size={11} className="text-blue-600 shrink-0" />
                            )}
                        </div>
                        <span className="flex items-center gap-0.5 text-stone-400 shrink-0 text-[10px]">
                            <MapPin size={9} />
                            {item.seller.city}
                        </span>
                    </div>

                    {/* Material Title & Category */}
                    <div>
                        <h3 
                            onClick={() => onOpenDetail && onOpenDetail(item)}
                            className="font-bold text-stone-900 text-xs line-clamp-1 leading-snug group-hover:text-clay-700 transition-colors cursor-pointer"
                        >
                            {item.name}
                        </h3>
                        <span className="inline-block rounded bg-stone-100 px-1.5 py-0.2 text-[9px] font-semibold text-stone-500 mt-0.5">
                            {item.category}
                        </span>
                    </div>

                    {/* Pricing Block */}
                    <div className="pt-0.5 flex items-baseline justify-between">
                        <div>
                            <span className="text-sm font-extrabold text-stone-900">
                                {formatCurrency(item.effective_price)}
                            </span>
                            <span className="text-[10px] text-stone-400 ml-0.5">/{item.supply_unit}</span>
                        </div>
                        {item.wholesale_price && item.wholesale_min_qty && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                hasDiscount ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'bg-stone-100 text-stone-600'
                            }`}>
                                {formatCurrency(item.wholesale_price)} ({item.wholesale_min_qty}+)
                            </span>
                        )}
                    </div>

                    {/* Dynamic Courier Estimation Pill */}
                    <div className="rounded-lg bg-stone-50 border border-stone-150 px-2 py-0.5 text-[10px] text-stone-600 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium text-[10px]">
                            {totalWeight > 200 ? (
                                <Truck size={11} className="text-clay-600" />
                            ) : totalWeight > 20 ? (
                                <Car size={11} className="text-amber-600" />
                            ) : (
                                <Bike size={11} className="text-stone-500" />
                            )}
                            <span>{vehicleLabel}</span>
                        </span>
                        <span className="font-semibold text-stone-600 text-[10px]">{totalWeight} kg</span>
                    </div>
                </div>

                {/* Streamlined Single-Row Action Controls */}
                <div className="pt-2 border-t border-stone-150 flex items-center gap-1.5">
                    {/* Stepper */}
                    <div className="flex items-center rounded-lg border border-stone-200 bg-stone-50/50 shrink-0">
                        <button
                            type="button"
                            onClick={() => onQuantityChange(item, qty - 1)}
                            disabled={qty <= (item.moq || 1)}
                            className="px-1.5 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Decrease quantity"
                        >
                            <Minus size={10} />
                        </button>
                        <span className="px-1 text-[11px] font-bold text-stone-900 w-5 text-center">{qty}</span>
                        <button
                            type="button"
                            onClick={() => onQuantityChange(item, qty + 1)}
                            disabled={qty >= item.stock}
                            className="px-1.5 py-1 text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed"
                            aria-label="Increase quantity"
                        >
                            <Plus size={10} />
                        </button>
                    </div>

                    {/* Cart Button */}
                    <button
                        type="button"
                        onClick={() => onAddToCart(item, qty)}
                        className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-colors shadow-2xs shrink-0"
                        title="Add to Sourcing Cart"
                    >
                        <ShoppingCart size={13} />
                    </button>

                    {/* Buy Button */}
                    <button
                        type="button"
                        onClick={() => onQuickOrder(item, qty)}
                        className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-clay-600 py-1.5 text-[11px] font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors min-w-0"
                    >
                        <span>Buy Now</span>
                        <ArrowUpRight size={12} />
                    </button>
                </div>
            </div>
        </div>
    );
}
