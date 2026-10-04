import React, { useState } from 'react';
import { Store, Package, AlertTriangle, ShieldCheck, MessageCircle, Truck, Car, Bike, ChevronDown, ChevronUp, Plus, Minus, Trash2 } from 'lucide-react';

const peso = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function OrderPricingSummary({
    summary,
    shippingQuote,
    shippingMethod,
    convenienceFeeRate,
    showAggregateBreakdown,
    totalSellers,
    submitDisabled,
    isPendingArtisan,
    processing,
    submitCheckout,
    setQuoteRetryNonce,
    hideSubmitButton = false,
    hideTitle = false,
    flat = false,
    onUpdateQty,
    onRemoveItem,
    updatingItemId,
    removingItemId,
}) {
    const [collapsedGroups, setCollapsedGroups] = useState({});

    const toggleGroup = (sellerId) => {
        setCollapsedGroups((prev) => ({
            ...prev,
            [sellerId]: !prev[sellerId],
        }));
    };

    const allCollapsed = summary.groups.length > 0 && summary.groups.every((g) => collapsedGroups[g.sellerId]);
    const toggleAll = () => {
        if (allCollapsed) {
            setCollapsedGroups({});
        } else {
            const next = {};
            summary.groups.forEach((g) => {
                next[g.sellerId] = true;
            });
            setCollapsedGroups(next);
        }
    };

    const quoteShimmer = (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-stone-100 border border-stone-200/80 animate-pulse text-[11px] text-stone-500 font-medium shrink-0">
            <span className="h-1.5 w-8 rounded-full bg-stone-300"></span>
            <span className="text-[10px] text-stone-500 font-mono font-bold tracking-tight">Calculating...</span>
        </span>
    );

    const shippingFeeSummaryValue = shippingMethod === 'Pick Up'
        ? peso(0)
        : shippingQuote.status === 'ready'
            ? peso(summary.shippingFeeTotal)
            : shippingQuote.status === 'error'
                ? 'Unavailable'
            : quoteShimmer;

    const renderPackages = () => (
        <div className="space-y-2.5">
            {summary.groups.map((group, groupIndex) => {
                const isCollapsed = Boolean(collapsedGroups[group.sellerId]);
                const totalItemsCount = group.items.reduce((sum, item) => sum + item.qty, 0);

                return (
                    <div key={group.sellerId} className="space-y-2.5 rounded-xl border border-stone-200/80 bg-stone-50/40 p-2.5 sm:p-3 transition-all">
                        {/* Card Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-stone-200/60 pb-1.5">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                <Store size={13} className="text-clay-600 shrink-0" />
                                <span className="text-xs font-bold text-stone-900 uppercase tracking-wider truncate" title={group.shopName}>
                                    {group.shopName}
                                </span>
                            </div>
                            {summary.groups.length > 1 && (
                                <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-clay-100/90 text-clay-800 border border-clay-200/60 shadow-2xs shrink-0 whitespace-nowrap">
                                    Package {groupIndex + 1} of {summary.groups.length}
                                </span>
                            )}
                        </div>

                        {/* Items List with Qty Controls and Remove Button */}
                        <div className="space-y-2">
                            {group.items.map((item, index) => {
                                const itemKey = item.cart_key || item.id;
                                const isUpdating = updatingItemId === itemKey;
                                const isRemoving = removingItemId === itemKey;
                                const minQty = item.is_b2b_supply ? (item.moq || 1) : 1;

                                return (
                                    <div key={`${group.sellerId}-${index}`} className="flex gap-2 bg-white/80 p-2 rounded-lg border border-stone-200/50 shadow-2xs transition-all">
                                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-stone-250 bg-stone-100">
                                            <img 
                                                src={item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : '/images/no-image.png'} 
                                                alt={item.name} 
                                                className="h-full w-full object-cover" 
                                                onError={(event) => { event.target.onerror = null; event.target.src = '/images/no-image.png'; }} 
                                            />
                                        </div>
                                        <div className="min-w-0 flex-1 flex flex-col justify-between">
                                            <div>
                                                <div className="flex items-start justify-between gap-1.5">
                                                    <p className="line-clamp-1 text-xs font-bold text-stone-900 leading-snug" title={item.name}>
                                                        {item.name}
                                                    </p>
                                                    {onRemoveItem && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onRemoveItem(item)}
                                                            disabled={isRemoving}
                                                            className="text-stone-400 hover:text-rose-600 p-0.5 rounded transition shrink-0 hover:bg-rose-50 disabled:opacity-40"
                                                            title="Remove item"
                                                        >
                                                            <Trash2 size={12} />
                                                        </button>
                                                    )}
                                                </div>
                                                {item.variant && item.variant !== 'Standard' && (
                                                    <p className="text-[10px] text-stone-500 font-medium truncate">{item.variant}</p>
                                                )}
                                            </div>

                                            <div className="flex items-center justify-between gap-2 mt-1.5 pt-1 border-t border-stone-200/40">
                                                {onUpdateQty ? (
                                                    <div className="inline-flex items-center rounded-md border border-stone-250 bg-white shadow-2xs">
                                                        <button
                                                            type="button"
                                                            onClick={() => onUpdateQty(item, -1)}
                                                            disabled={isRemoving}
                                                            className="flex h-5 w-5.5 items-center justify-center rounded-l-md text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:opacity-40 transition active:scale-90"
                                                            title={item.qty <= minQty ? 'Remove item' : 'Decrease quantity'}
                                                        >
                                                            {item.qty <= minQty ? <Trash2 size={9} className="text-rose-500" /> : <Minus size={9} />}
                                                        </button>
                                                        <span className="min-w-[20px] text-center text-xs font-bold text-stone-800 font-mono">
                                                            {item.qty}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => onUpdateQty(item, 1)}
                                                            disabled={isRemoving}
                                                            className="flex h-5 w-5.5 items-center justify-center rounded-r-md text-stone-500 hover:bg-stone-100 hover:text-stone-800 disabled:opacity-40 transition active:scale-90"
                                                            title="Increase quantity"
                                                        >
                                                            <Plus size={9} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10.5px] text-stone-500 font-medium">Qty: {item.qty}</span>
                                                )}

                                                <div className="text-right shrink-0">
                                                    <span className="text-xs font-bold text-clay-600 block whitespace-nowrap">
                                                        {peso(item.price * item.qty)}
                                                    </span>
                                                    {item.qty > 1 && (
                                                        <span className="text-[9px] text-stone-400 block whitespace-nowrap font-mono">
                                                            {peso(item.price)} ea
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pricing Breakdown Section */}
                        <div className="space-y-1.5 border-t border-stone-200/60 pt-1.5 text-xs">
                            {!isCollapsed && (
                                <div className="rounded-lg bg-white/90 p-2 text-[10.5px] text-stone-600 border border-stone-200/70 shadow-2xs space-y-1 transition-all">
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="text-stone-500">Items Subtotal ({totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'})</span>
                                        <span className="font-semibold text-stone-800 shrink-0 text-right whitespace-nowrap">{peso(group.subtotal)}</span>
                                    </div>
                                    {shippingMethod === 'Delivery' ? (
                                        <>
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        <span className="text-stone-500">Delivery</span>
                                                        {group.location && (
                                                            <span className="text-[10px] text-stone-400 font-normal truncate max-w-[120px]" title={`Workshop in ${group.location}`}>
                                                                · {group.location}
                                                            </span>
                                                        )}
                                                        {group.vehicleInfo && (
                                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9.5px] font-semibold shrink-0 border ${
                                                                group.vehicleInfo.is_upgraded
                                                                    ? 'bg-amber-50 text-amber-900 border-amber-200/80'
                                                                    : 'bg-stone-100 text-stone-700 border-stone-200/60'
                                                            }`} title={group.vehicleInfo.reason}>
                                                                {group.vehicleInfo.icon === 'car' ? (
                                                                    <Car size={10} className="shrink-0 text-amber-700" />
                                                                ) : group.vehicleInfo.icon === 'truck' ? (
                                                                    <Truck size={10} className="shrink-0 text-amber-700" />
                                                                ) : (
                                                                    <Bike size={10} className="shrink-0 text-stone-500" />
                                                                )}
                                                                <span>{group.vehicleInfo.label}</span>
                                                            </span>
                                                        )}
                                                    </div>
                                                    {group.vehicleInfo?.is_upgraded && group.vehicleInfo?.reason && (
                                                        <p className="mt-1 text-[10px] text-amber-900/90 bg-amber-50/80 rounded p-1.5 border border-amber-200/60 leading-snug">
                                                            {group.vehicleInfo.reason}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="font-semibold text-stone-800 shrink-0 text-right whitespace-nowrap">
                                                    {shippingQuote.status === 'ready' ? (
                                                        peso(group.shippingFee)
                                                    ) : shippingQuote.status === 'error' ? (
                                                        'Unavailable'
                                                    ) : quoteShimmer}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-stone-500">Delivery & Handling Care ({parseFloat((convenienceFeeRate * 100).toFixed(2))}%)</span>
                                                <span className="font-semibold text-stone-800 shrink-0 text-right whitespace-nowrap">{peso(group.platformFee)}</span>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="min-w-0 flex-1">
                                                <span className="text-stone-500 block">Workshop Pick Up</span>
                                                {group.location && (
                                                    <span className="text-[10px] text-stone-400 block truncate" title={`Studio: ${group.location}`}>
                                                        Studio in {group.location}
                                                    </span>
                                                )}
                                                {group.pickupSchedule?.date && (
                                                    <span className="text-[10px] font-medium text-emerald-700 block mt-0.5">
                                                        {group.pickupSchedule.formattedDate || group.pickupSchedule.date} ({group.pickupSchedule.time_slot})
                                                    </span>
                                                )}
                                            </div>
                                            <span className="font-semibold text-emerald-600 shrink-0 text-right whitespace-nowrap">
                                                PHP 0.00
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Collapsed 1-line formula strip */}
                            {isCollapsed && shippingMethod === 'Delivery' && shippingQuote.status === 'ready' && (
                                <div className="flex items-center justify-between rounded-lg bg-stone-100/80 px-2.5 py-1.5 text-[10px] font-mono text-stone-600 border border-stone-200/50">
                                    <span className="truncate">{peso(group.subtotal)} + {peso(group.shippingFee)} ship + {peso(group.platformFee)} care</span>
                                </div>
                            )}

                            {/* Package Total Row with Collapse/Expand Action */}
                            <div className="flex items-center justify-between pt-1.5 border-t border-stone-200/50">
                                <span className="text-xs font-bold text-stone-900">
                                    {summary.groups.length > 1 ? 'Package Total' : 'Order Total'}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                    {summary.groups.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => toggleGroup(group.sellerId)}
                                            className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-clay-600 hover:text-clay-700 bg-clay-50/80 px-2 py-0.5 rounded-md border border-clay-200/60 transition active:scale-95"
                                        >
                                            <span>{isCollapsed ? 'Details' : 'Hide'}</span>
                                            {isCollapsed ? <ChevronDown size={10} /> : <ChevronUp size={10} />}
                                        </button>
                                    )}
                                    <span className="text-sm font-extrabold text-stone-900 whitespace-nowrap">{peso(group.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    const renderBreakdown = () => (
        <div className="space-y-2.5 border-t border-stone-100 pt-3 text-xs text-stone-600">
            {showAggregateBreakdown && (
                <>
                    <div className="flex justify-between items-center gap-2">
                        <span>Items Subtotal</span>
                        <span className="font-semibold text-stone-900 shrink-0 text-right whitespace-nowrap">{peso(summary.merchandiseSubtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                        <span>Delivery & Handling Care ({parseFloat((convenienceFeeRate * 100).toFixed(2))}%)</span>
                        <span className="font-semibold text-stone-900 shrink-0 text-right whitespace-nowrap">{peso(summary.platformFeeTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                        <span className="flex items-center gap-1 min-w-0">
                            <span className="truncate">Estimated Delivery Fee</span>
                            <span className="text-[10px] text-stone-400 font-normal shrink-0">({totalSellers} couriers)</span>
                        </span>
                        <span className={shippingMethod === 'Delivery' && shippingQuote.status !== 'ready' ? 'text-xs italic text-stone-400 shrink-0 text-right whitespace-nowrap' : 'font-semibold text-stone-900 shrink-0 text-right whitespace-nowrap'}>
                            {shippingFeeSummaryValue}
                        </span>
                    </div>
                </>
            )}
            {totalSellers > 1 && (
                <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50/50 p-2 text-[10.5px] text-blue-700">
                    <Package size={13} className="shrink-0 mt-0.5" />
                    <div>
                        <span className="font-bold">Split Orders:</span>{' '}
                        <span className="text-blue-600 leading-snug">Cart has items from {totalSellers} artisans. Placed as {totalSellers} separate orders.</span>
                    </div>
                </div>
            )}
            {shippingMethod === 'Delivery' && shippingQuote.status === 'error' ? (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50/40 p-3 text-xs">
                    <div className="flex gap-2 text-red-700">
                        <AlertTriangle size={14} className="shrink-0 mt-0.5 animate-bounce" />
                        <div>
                            <p className="font-bold">Delivery Quote Failed</p>
                            <p className="mt-0.5 text-rose-600 leading-relaxed text-[11px]">Unable to calculate shipping. Please verify your address or connection and try again.</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setQuoteRetryNonce((current) => current + 1)}
                        className="mt-2 w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-center text-xs font-bold text-rose-700 hover:bg-rose-50 transition-colors shadow-xs"
                    >
                        Retry Quote Calculation
                    </button>
                </div>
            ) : (
                <p className="text-center text-[10px] text-stone-400 mt-0.5">
                    {shippingMethod === 'Pick Up'
                        ? 'Pickup orders have no shipping charge.'
                        : shippingQuote.status === 'ready'
                            ? 'Shipping fee is already included in the total due now.'
                            : 'Waiting for the delivery quote before enabling checkout.'}
                </p>
            )}
        </div>
    );

    const renderTotalDue = () => (
        <div className="flex justify-between items-center text-sm font-bold text-stone-900">
            <span className="text-stone-800">Total Due Now</span>
            <span className="text-lg font-extrabold text-stone-900 shrink-0 whitespace-nowrap">{peso(summary.grandTotal)}</span>
        </div>
    );

    const renderSubmitButton = () => {
        if (hideSubmitButton) return null;
        return (
            <div className="pt-0.5">
                <button
                    onClick={submitCheckout}
                    disabled={submitDisabled || isPendingArtisan}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 py-2.5 text-sm font-bold text-white shadow-sm shadow-clay-200 transition-all duration-200 hover:bg-clay-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {processing ? (
                        <>
                            <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                            </svg>
                            <span>Processing...</span>
                        </>
                    ) : (
                        <>
                            <ShieldCheck size={16} />
                            <span>{totalSellers > 1 ? `Place ${totalSellers} Orders` : 'Place Order'}</span>
                        </>
                    )}
                </button>
                {isPendingArtisan && <p className="mt-1 text-center text-xs font-bold text-amber-600">Checkout is disabled for pending shops.</p>}
                <p className="mt-1 flex items-center justify-center gap-1 text-center text-[10px] text-stone-400">
                    <MessageCircle size={11} />
                    Chat opens after ordering
                </p>
            </div>
        );
    };

    if (flat) {
        return (
            <div className="space-y-3">
                {renderPackages()}
                <div className="space-y-2.5 border-t border-stone-100 pt-2.5">
                    {renderBreakdown()}
                    <div className="border-t border-stone-200/60 pt-2.5">
                        {renderTotalDue()}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="rounded-2xl border border-stone-200 bg-white shadow-sm flex flex-col max-h-[calc(100dvh-6rem)] overflow-hidden">
            {/* 1. Header (pinned at top) */}
            {!hideTitle && (
                <div className="px-3.5 py-2.5 border-b border-stone-100 flex items-center justify-between gap-2 shrink-0 bg-white">
                    <h3 className="text-sm font-bold text-stone-900 tracking-tight">Order Summary</h3>
                    {summary.groups.length > 1 && (
                        <button
                            type="button"
                            onClick={toggleAll}
                            className="text-[11px] font-semibold text-clay-600 hover:text-clay-700 transition"
                        >
                            {allCollapsed ? 'Expand All' : 'Collapse All'}
                        </button>
                    )}
                </div>
            )}

            {/* 2. Scrollable Body: Packages and Details */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-3.5 space-y-3">
                {renderPackages()}
                {renderBreakdown()}
            </div>

            {/* 3. Pinned Footer: Total Due & Submit Button (ALWAYS visible on screen!) */}
            <div className="shrink-0 border-t border-stone-200/80 bg-stone-50/70 p-3 sm:p-3.5 space-y-2 shadow-[0_-4px_12px_rgba(0,0,0,0.03)]">
                {renderTotalDue()}
                {renderSubmitButton()}
            </div>
        </div>
    );
}
