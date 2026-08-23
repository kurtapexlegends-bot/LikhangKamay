import React from 'react';
import { 
    Truck, Store, ShieldCheck, MapPin, Plus, Minus, 
    ShoppingCart, ArrowUpRight, Bike, Car 
} from 'lucide-react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function SupplyCard({
    item,
    quantity,
    onQuantityChange,
    onAddToCart,
    onQuickOrder,
}) {
    const qty = quantity || item.moq || 1;
    const hasWholesaleDiscount = item.wholesale_price && item.wholesale_min_qty && qty >= item.wholesale_min_qty;
    const unitPrice = hasWholesaleDiscount ? item.wholesale_price : item.effective_price;
    const subtotal = unitPrice * qty;
    const totalWeight = Math.round((qty * (item.weight || 1.0) * 1.10) * 10) / 10;

    return (
        <div className="flex flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-xs hover:shadow-md transition-all duration-200 space-y-3.5">
            {/* Image & Header */}
            <div className="space-y-3">
                <div className="relative aspect-4/3 w-full overflow-hidden rounded-xl bg-stone-100 border border-stone-200/70">
                    <img
                        src={item.img || '/images/placeholder.svg'}
                        alt={item.name}
                        className="h-full w-full object-cover"
                        onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                    />
                    <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                        <span className="rounded-md bg-stone-900/85 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider">
                            MOQ: {item.moq} {item.supply_unit}
                        </span>
                        <span className="rounded-md bg-white/90 backdrop-blur-xs px-2 py-0.5 text-[10px] font-bold text-stone-800 border border-stone-200/60">
                            {item.weight} kg / {item.supply_unit}
                        </span>
                    </div>
                </div>

                {/* Studio Attribution */}
                <div className="flex items-center justify-between gap-2 text-[11px] text-stone-500">
                    <div className="flex items-center gap-1.5 min-w-0 font-medium">
                        <Store size={12} className="text-clay-600 shrink-0" />
                        <span className="truncate font-semibold text-stone-800">{item.seller.shop_name}</span>
                        {item.seller.is_verified && (
                            <ShieldCheck size={12} className="text-blue-600 shrink-0" />
                        )}
                    </div>
                    <span className="flex items-center gap-0.5 text-stone-400 shrink-0">
                        <MapPin size={11} />
                        {item.seller.city}
                    </span>
                </div>

                {/* Title & Category */}
                <div>
                    <h4 className="font-bold text-stone-900 text-sm line-clamp-1">{item.name}</h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">{item.category}</p>
                </div>

                {/* Pricing Box */}
                <div className="rounded-xl border border-stone-200/80 bg-stone-50/70 p-2.5 text-xs space-y-1">
                    <div className="flex items-baseline justify-between">
                        <span className="text-stone-500 font-medium">Base Price:</span>
                        <span className="font-bold text-stone-900">{formatCurrency(item.effective_price)} / {item.supply_unit}</span>
                    </div>
                    {item.wholesale_price && item.wholesale_min_qty && (
                        <div className={`flex items-baseline justify-between text-[11px] font-semibold ${hasWholesaleDiscount ? 'text-emerald-700' : 'text-stone-500'}`}>
                            <span>Wholesale ({item.wholesale_min_qty}+ {item.supply_unit}):</span>
                            <span>{formatCurrency(item.wholesale_price)} / {item.supply_unit}</span>
                        </div>
                    )}
                </div>

                {/* Heavy Load Vehicle Estimation Badge */}
                <div className="rounded-lg bg-stone-100/90 px-2.5 py-1.5 text-[11px] text-stone-600 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                        {totalWeight > 200 ? (
                            <Truck size={13} className="text-clay-600" />
                        ) : totalWeight > 20 ? (
                            <Car size={13} className="text-amber-600" />
                        ) : (
                            <Bike size={13} className="text-stone-500" />
                        )}
                        <span className="font-medium">{item.vehicle_preview.label}</span>
                    </span>
                    <span className="font-bold text-stone-700">{totalWeight} kg</span>
                </div>
            </div>

            {/* Actions & Quantity Stepper */}
            <div className="space-y-2.5 pt-2 border-t border-stone-150">
                <div className="flex items-center justify-between">
                    <span className="text-xs text-stone-500 font-medium">Order Quantity:</span>
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={() => onQuantityChange(item, qty - 1)}
                            disabled={qty <= (item.moq || 1)}
                            className="h-7 w-7 rounded-lg border border-stone-200 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Decrease quantity"
                        >
                            <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-bold text-stone-900">{qty}</span>
                        <button
                            type="button"
                            onClick={() => onQuantityChange(item, qty + 1)}
                            disabled={qty >= item.stock}
                            className="h-7 w-7 rounded-lg border border-stone-200 bg-white flex items-center justify-center text-stone-600 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
                            aria-label="Increase quantity"
                        >
                            <Plus size={12} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-between font-bold text-stone-900 text-xs">
                    <span className="text-stone-500">Subtotal:</span>
                    <span className="text-sm font-extrabold text-clay-700">{formatCurrency(subtotal)}</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={() => onAddToCart(item, qty)}
                        className="flex items-center justify-center gap-1.5 rounded-xl border border-stone-200 bg-stone-50 py-2 text-xs font-bold text-stone-800 hover:bg-stone-100 transition-colors"
                    >
                        <ShoppingCart size={13} />
                        <span>Add to Cart</span>
                    </button>
                    <button
                        type="button"
                        onClick={() => onQuickOrder(item, qty)}
                        className="flex items-center justify-center gap-1 rounded-xl bg-clay-600 py-2 text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-colors"
                    >
                        <span>Buy Wholesale</span>
                        <ArrowUpRight size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
}
