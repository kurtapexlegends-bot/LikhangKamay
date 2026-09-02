import React, { useState } from 'react';
import { 
    Store, ShieldCheck, MapPin, Plus, Minus, 
    ShoppingCart, ArrowUpRight, Bike, Car, Truck, Percent, Eye 
} from 'lucide-react';
import { router } from '@inertiajs/react';

const formatCurrency = (val) => `₱${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function B2BSupplyCard({
    supply,
    item: propItem,
    quantity: controlledQuantity,
    onQuantityChange,
    onAddToCart,
    onQuickOrder,
    onOpenDetail,
    onViewDetail,
}) {
    const item = supply || propItem;
    const minOrderQty = Math.max(1, Number(item?.moq) || 1);
    const [localQty, setLocalQty] = useState(minOrderQty);

    if (!item) return null;

    const qty = controlledQuantity !== undefined ? controlledQuantity : localQty;

    const handleQtyChange = (newQty) => {
        const validated = Math.max(minOrderQty, Math.min(Number(item.stock) || 9999, newQty));
        if (onQuantityChange) {
            onQuantityChange(item, validated);
        } else {
            setLocalQty(validated);
        }
    };

    const handleDetailClick = () => {
        if (onViewDetail) {
            onViewDetail(item);
        } else if (onOpenDetail) {
            onOpenDetail(item);
        }
    };

    const handleQuickOrderClick = () => {
        if (onQuickOrder) {
            onQuickOrder(item, qty);
        } else if (onAddToCart) {
            onAddToCart(item, qty);
            router.visit(route('seller.supply-hub.cart'));
        }
    };

    const hasDiscount = item.wholesale_price && item.wholesale_min_qty && qty >= item.wholesale_min_qty;
    const unitPrice = hasDiscount ? Number(item.wholesale_price) : Number(item.effective_price || item.price || 0);
    const totalWeight = Math.round((qty * (Number(item.weight) || 1.0) * 1.10) * 10) / 10;

    const discountPercentage = (item.wholesale_price && (item.effective_price || item.price))
        ? Math.round((((item.effective_price || item.price) - item.wholesale_price) / (item.effective_price || item.price)) * 100)
        : null;

    // Dynamic vehicle tier estimation
    const vehicleLabel = totalWeight > 300
        ? 'Large Van'
        : totalWeight > 200
            ? 'MPV'
            : totalWeight > 20
                ? 'Sedan'
                : 'Motorcycle';

    const sellerName = item.seller?.shop_name || item.seller?.name || item.shop_name || 'Artisan Workshop';
    const sellerCity = item.seller?.city || item.city || 'Cavite';
    const isSellerVerified = item.seller?.is_verified ?? true;

    return (
        <div className="group bg-white rounded-2xl border border-stone-200/90 shadow-2xs hover:shadow-md hover:border-stone-300 transition-all duration-200 flex flex-col overflow-hidden">
            {/* Image Container with Hover Zoom & Click to View */}
            <div 
                onClick={handleDetailClick}
                className="aspect-4/3 relative overflow-hidden bg-stone-100 border-b border-stone-150 cursor-pointer"
            >
                <img
                    loading="lazy"
                    decoding="async"
                    src={item.img || '/images/placeholder.svg'}
                    alt={item.name}
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/images/placeholder.svg'; }}
                />

                {/* Top Badges */}
                <div className="absolute top-1.5 left-1.5 right-1.5 sm:top-2 sm:left-2 sm:right-2 z-10 flex items-center justify-between pointer-events-none gap-1">
                    <span className="bg-stone-900/80 backdrop-blur-xs text-white text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md shadow-2xs">
                        Min. {minOrderQty} {item.supply_unit || 'pcs'}
                    </span>

                    {discountPercentage && discountPercentage > 0 && (
                        <span className="bg-rose-600 text-white text-[9px] sm:text-[10px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                            <Percent size={8} className="sm:w-2.5 sm:h-2.5" /> -{discountPercentage}%
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
            <div className="p-2.5 sm:p-3.5 flex flex-col flex-1 justify-between space-y-2 sm:space-y-2.5">
                <div className="space-y-1 sm:space-y-1.5">
                    {/* Studio Attribution & City */}
                    <div className="flex items-center justify-between gap-1 text-[10px] sm:text-[11px] text-stone-500">
                        <div className="flex items-center gap-1 min-w-0 font-medium">
                            <Store size={11} className="text-clay-600 shrink-0" />
                            <span className="truncate font-semibold text-stone-800">{sellerName}</span>
                            {isSellerVerified && (
                                <ShieldCheck size={11} className="text-blue-600 shrink-0" />
                            )}
                        </div>
                        <span className="hidden min-[400px]:flex items-center gap-0.5 text-stone-400 shrink-0 text-[9px] sm:text-[10px]">
                            <MapPin size={9} />
                            {sellerCity}
                        </span>
                    </div>

                    {/* Material Title & Category */}
                    <div>
                        <h3 
                            onClick={handleDetailClick}
                            className="font-bold text-stone-900 text-xs line-clamp-1 leading-snug group-hover:text-clay-700 transition-colors cursor-pointer"
                        >
                            {item.name}
                        </h3>
                        <span className="inline-block rounded bg-stone-100 px-1.5 py-0.2 text-[8px] sm:text-[9px] font-semibold text-stone-500 mt-0.5">
                            {item.category}
                        </span>
                    </div>

                    {/* Pricing Block */}
                    <div className="pt-0.5 flex flex-wrap items-baseline justify-between gap-1">
                        <div>
                            <span className="text-xs sm:text-sm font-extrabold text-stone-900">
                                {formatCurrency(unitPrice)}
                            </span>
                            <span className="text-[9px] sm:text-[10px] text-stone-400 ml-0.5">/{item.supply_unit || 'pcs'}</span>
                        </div>
                        {item.wholesale_price && item.wholesale_min_qty && (
                            <span className={`text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                hasDiscount ? 'bg-emerald-100 text-emerald-800 font-extrabold' : 'bg-stone-100 text-stone-600'
                            }`}>
                                {formatCurrency(item.wholesale_price)} ({item.wholesale_min_qty}+)
                            </span>
                        )}
                    </div>

                    {/* Dynamic Courier Estimation Pill */}
                    <div className="rounded-lg bg-stone-50 border border-stone-150 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] text-stone-600 flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium truncate">
                            {totalWeight > 200 ? (
                                <Truck size={10} className="text-clay-600 shrink-0" />
                            ) : totalWeight > 20 ? (
                                <Car size={10} className="text-amber-600 shrink-0" />
                            ) : (
                                <Bike size={10} className="text-stone-500 shrink-0" />
                            )}
                            <span className="truncate">{vehicleLabel}</span>
                        </span>
                        <span className="font-semibold text-stone-600 shrink-0 ml-1">{totalWeight} kg</span>
                    </div>
                </div>

                {/* Streamlined Single-Row Action Controls */}
                <div className="pt-2 border-t border-stone-150 flex items-center gap-1 sm:gap-1.5">
                    {/* Stepper */}
                    <div className="flex items-center rounded-xl border border-stone-200 bg-stone-50/50 shrink-0 h-[32px] sm:h-[38px]">
                        <button
                            type="button"
                            onClick={() => handleQtyChange(qty - 1)}
                            disabled={qty <= minOrderQty}
                            className="px-1.5 sm:px-2 h-full text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition active:scale-95 flex items-center justify-center"
                            aria-label="Decrease quantity"
                        >
                            <Minus size={10} />
                        </button>
                        <span className="px-0.5 sm:px-1 text-[11px] sm:text-xs font-bold text-stone-900 min-w-[16px] sm:min-w-[22px] text-center">{qty}</span>
                        <button
                            type="button"
                            onClick={() => handleQtyChange(qty + 1)}
                            disabled={qty >= (Number(item.stock) || 9999)}
                            className="px-1.5 sm:px-2 h-full text-stone-600 hover:bg-stone-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition active:scale-95 flex items-center justify-center"
                            aria-label="Increase quantity"
                        >
                            <Plus size={10} />
                        </button>
                    </div>

                    {/* Cart Button */}
                    <button
                        type="button"
                        onClick={() => onAddToCart && onAddToCart(item, qty)}
                        className="h-[32px] sm:h-[38px] w-[32px] sm:w-[38px] flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-50 hover:border-stone-300 transition-all shadow-2xs shrink-0 cursor-pointer active:scale-95"
                        title="Add to Cart"
                        aria-label="Add to cart"
                    >
                        <ShoppingCart size={13} className="sm:w-3.5 sm:h-3.5" />
                    </button>

                    {/* Buy Button */}
                    <button
                        type="button"
                        onClick={handleQuickOrderClick}
                        className="flex-1 h-[32px] sm:h-[38px] flex items-center justify-center gap-1 rounded-xl bg-clay-600 px-2 sm:px-3 text-[11px] sm:text-xs font-bold text-white shadow-2xs hover:bg-clay-700 transition-all min-w-0 cursor-pointer active:scale-95"
                    >
                        <span>Order</span>
                        <ArrowUpRight size={12} className="sm:w-3.5 sm:h-3.5" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default React.memo(B2BSupplyCard);
