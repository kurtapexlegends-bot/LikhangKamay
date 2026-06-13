import React from 'react';
import { Store, Package, AlertTriangle, ShieldCheck, MessageCircle } from 'lucide-react';

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
}) {
    const shippingFeeSummaryValue = shippingMethod === 'Pick Up'
        ? peso(0)
        : shippingQuote.status === 'ready'
            ? peso(summary.shippingFeeTotal)
            : shippingQuote.status === 'error'
                ? 'Unavailable'
            : (
                <span className="inline-flex items-center gap-0.5">
                    <span className="h-1 w-1 animate-pulse rounded-full bg-stone-400"></span>
                    <span className="h-1 w-1 animate-pulse rounded-full bg-stone-400 [animation-delay:0.15s]"></span>
                    <span className="h-1 w-1 animate-pulse rounded-full bg-stone-400 [animation-delay:0.3s]"></span>
                </span>
            );

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-sm font-bold text-stone-900 tracking-tight">Order Summary</h3>
            <div className="mb-5 max-h-88 space-y-4 overflow-y-auto pr-1.5 custom-scrollbar">
                {summary.groups.map((group) => (
                    <div key={group.sellerId} className="space-y-4 rounded-xl border border-stone-100 bg-stone-50/35 p-4">
                        <div className="flex items-center gap-2 border-b border-stone-200/60 pb-2">
                            <Store size={14} className="text-clay-500" />
                            <span className="text-xs font-bold text-stone-800 uppercase tracking-wider">{group.shopName}</span>
                        </div>
                        {group.items.map((item, index) => (
                            <div key={`${group.sellerId}-${index}`} className="flex gap-3">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-stone-250 bg-stone-100">
                                    <img 
                                        src={item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : '/images/no-image.png'} 
                                        alt={item.name} 
                                        className="h-full w-full object-cover" 
                                        onError={(event) => { event.target.onerror = null; event.target.src = '/images/no-image.png'; }} 
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-1 text-sm font-bold text-stone-900">{item.name}</p>
                                    <p className="text-[11px] text-stone-400 mt-0.5">{item.variant} - Qty: {item.qty}</p>
                                    <p className="text-sm font-semibold text-clay-600 mt-1">{peso(item.price * item.qty)}</p>
                                </div>
                            </div>
                        ))}
                        <div className="space-y-1.5 border-t border-stone-200/60 pt-3 text-xs text-stone-500">
                            {!showAggregateBreakdown && (
                                <>
                                    <div className="flex justify-between">
                                        <span>Merchandise</span>
                                        <span className="font-semibold text-stone-800">{peso(group.subtotal)}</span>
                                    </div>
                                    {shippingMethod === 'Delivery' && (
                                        <div className="flex justify-between">
                                            <span>Platform Fee ({parseFloat((convenienceFeeRate * 100).toFixed(2))}%)</span>
                                            <span className="font-semibold text-stone-800">{peso(group.platformFee)}</span>
                                        </div>
                                    )}
                                    {shippingMethod === 'Delivery' && (
                                        <div className="flex justify-between">
                                            <span>Shipping Fee</span>
                                            <span className={shippingQuote.status !== 'ready' ? 'italic text-stone-400 font-normal' : 'font-semibold text-stone-800'}>
                                                {shippingQuote.status === 'ready' ? (
                                                    peso(group.shippingFee)
                                                ) : shippingQuote.status === 'error' ? (
                                                    'Unavailable'
                                                ) : (
                                                    <span className="inline-flex items-center gap-0.5">
                                                        <span className="h-1 w-1 animate-pulse rounded-full bg-stone-400"></span>
                                                        <span className="h-1 w-1 animate-pulse rounded-full bg-stone-400 [animation-delay:0.15s]"></span>
                                                        <span className="h-1 w-1 animate-pulse rounded-full bg-stone-400 [animation-delay:0.3s]"></span>
                                                    </span>
                                                )}
                                            </span>
                                        </div>
                                    )}
                                </>
                            )}
                            {showAggregateBreakdown && (
                                <div className="flex justify-between font-bold text-stone-800">
                                    <span>Seller Total</span>
                                    <span>{peso(group.total)}</span>
                                </div>
                            )}
                            {!showAggregateBreakdown && (
                                <div className="flex justify-between font-bold text-stone-900 pt-1 border-t border-dashed border-stone-150">
                                    <span>Order Total</span>
                                    <span>{peso(group.total)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="space-y-3 border-t border-stone-100 pt-4 text-sm text-stone-600">
                {showAggregateBreakdown && (
                    <>
                        <div className="flex justify-between">
                            <span>Merchandise Subtotal</span>
                            <span className="font-semibold text-stone-900">{peso(summary.merchandiseSubtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Platform Fee ({parseFloat((convenienceFeeRate * 100).toFixed(2))}%)</span>
                            <span className="font-semibold text-stone-900">{peso(summary.platformFeeTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Shipping Fee</span>
                            <span className={shippingMethod === 'Delivery' && shippingQuote.status !== 'ready' ? 'text-xs italic text-stone-400' : 'font-semibold text-stone-900'}>
                                {shippingFeeSummaryValue}
                            </span>
                        </div>
                    </>
                )}
                {totalSellers > 1 && (
                    <div className="flex items-start gap-2.5 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-blue-700">
                        <Package size={14} className="shrink-0 mt-0.5" />
                        <div>
                            <span className="font-bold">Split Orders</span>
                            <p className="mt-0.5 text-blue-600 leading-relaxed">Your cart contains items from {totalSellers} different artisans. This will be placed as {totalSellers} separate orders to route payments and shipping directly.</p>
                        </div>
                    </div>
                )}
                <div className="mt-3 flex justify-between border-t border-stone-200/60 pt-3 text-base font-bold text-stone-900">
                    <span>Total Due Now</span>
                    <span className="text-lg font-extrabold text-stone-900">{peso(summary.grandTotal)}</span>
                </div>
                
                {shippingMethod === 'Delivery' && shippingQuote.status === 'error' ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50/40 p-3.5 text-xs">
                        <div className="flex gap-2 text-red-700">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5 animate-bounce" />
                            <div>
                                <p className="font-bold">Delivery Quote Failed</p>
                                <p className="mt-0.5 text-red-655 leading-relaxed">Unable to calculate shipping. Please verify your address or connection and try again.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setQuoteRetryNonce((current) => current + 1)}
                            className="mt-2.5 w-full rounded-lg border border-red-250 bg-white px-3 py-2.5 text-center text-xs font-bold text-red-700 hover:bg-red-50 transition-colors shadow-sm"
                        >
                            Retry Quote Calculation
                        </button>
                    </div>
                ) : (
                    <p className="text-center text-[10px] text-stone-400 mt-1">
                        {shippingMethod === 'Pick Up'
                            ? 'Pickup orders have no shipping charge.'
                            : shippingQuote.status === 'ready'
                                ? 'Shipping fee is already included in the total due now.'
                                : 'Waiting for the delivery quote before enabling checkout.'}
                    </p>
                )}
            </div>
            
            {!hideSubmitButton && (
                <div className="hidden md:block">
                    <button
                        onClick={submitCheckout}
                        disabled={submitDisabled || isPendingArtisan}
                        className="mt-6 flex w-full items-center justify-center gap-2.5 rounded-xl bg-clay-600 py-3.5 text-sm font-bold text-white shadow-md shadow-clay-200 transition-all duration-300 hover:bg-clay-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
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
                                <ShieldCheck size={18} />
                                <span>{totalSellers > 1 ? `Place ${totalSellers} Orders` : 'Place Order'}</span>
                            </>
                        )}
                    </button>
                    {isPendingArtisan && <p className="mt-2 text-center text-xs font-bold text-amber-600">Checkout is disabled for pending shops.</p>}
                    <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-stone-400">
                        <MessageCircle size={12} />
                        Chat opens after ordering
                    </p>
                </div>
            )}
        </div>
    );
}
