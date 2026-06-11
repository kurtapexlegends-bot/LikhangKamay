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
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <h3 className="mb-4 text-base font-bold text-gray-900">Order Summary</h3>
            <div className="mb-5 max-h-80 space-y-5 overflow-y-auto pr-1.5 custom-scrollbar">
                {summary.groups.map((group) => (
                    <div key={group.sellerId} className="space-y-3">
                        <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                            <Store size={14} className="text-clay-500" />
                            <span className="text-sm font-bold text-gray-700">{group.shopName}</span>
                        </div>
                        {group.items.map((item, index) => (
                            <div key={`${group.sellerId}-${index}`} className="flex gap-3">
                                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
                                    <img 
                                        src={item.img ? (item.img.startsWith('http') || item.img.startsWith('/storage') ? item.img : `/storage/${item.img}`) : '/images/no-image.png'} 
                                        alt={item.name} 
                                        className="h-full w-full object-cover" 
                                        onError={(event) => { event.target.onerror = null; event.target.src = '/images/no-image.png'; }} 
                                    />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="line-clamp-1 text-sm font-bold text-gray-800">{item.name}</p>
                                    <p className="text-xs text-gray-500">{item.variant} - x{item.qty}</p>
                                    <p className="text-sm font-medium text-clay-600">{peso(item.price * item.qty)}</p>
                                </div>
                            </div>
                        ))}
                        <div className="space-y-1 border-t border-dashed border-gray-200 pt-2 text-xs text-gray-500">
                            {!showAggregateBreakdown && (
                                <>
                                    <div className="flex justify-between">
                                        <span>Merchandise</span>
                                        <span className="font-medium">{peso(group.subtotal)}</span>
                                    </div>
                                    {shippingMethod === 'Delivery' && (
                                        <div className="flex justify-between">
                                            <span>Platform Fee ({parseFloat((convenienceFeeRate * 100).toFixed(2))}%)</span>
                                            <span className="font-medium">{peso(group.platformFee)}</span>
                                        </div>
                                    )}
                                    {shippingMethod === 'Delivery' && (
                                        <div className="flex justify-between">
                                            <span>Shipping Fee</span>
                                            <span className={shippingQuote.status !== 'ready' ? 'italic text-gray-400 font-normal' : 'font-medium'}>
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
                                <div className="flex justify-between font-bold text-gray-700">
                                    <span>Seller Total</span>
                                    <span>{peso(group.total)}</span>
                                </div>
                            )}
                            {!showAggregateBreakdown && (
                                <div className="flex justify-between font-bold text-gray-900">
                                    <span>Order Total</span>
                                    <span>{peso(group.total)}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="space-y-2 border-t border-gray-100 pt-4 text-sm text-gray-600">
                {showAggregateBreakdown && (
                    <>
                        <div className="flex justify-between">
                            <span>Merchandise Subtotal</span>
                            <span>{peso(summary.merchandiseSubtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Platform Fee ({parseFloat((convenienceFeeRate * 100).toFixed(2))}%)</span>
                            <span>{peso(summary.platformFeeTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Shipping Fee</span>
                            <span className={shippingMethod === 'Delivery' && shippingQuote.status !== 'ready' ? 'text-xs italic text-gray-400' : ''}>
                                {shippingFeeSummaryValue}
                            </span>
                        </div>
                    </>
                )}
                {totalSellers > 1 && (
                    <div className="flex justify-between text-xs text-blue-600">
                        <span className="flex items-center gap-1">
                            <Package size={12} />Order Split
                        </span>
                        <span className="font-bold">{totalSellers} separate orders</span>
                    </div>
                )}
                <div className="mt-2 flex justify-between border-t border-dashed border-gray-200 pt-2 text-lg font-bold text-gray-900">
                    <span>Total Due Now</span>
                    <span>{peso(summary.grandTotal)}</span>
                </div>
                
                {shippingMethod === 'Delivery' && shippingQuote.status === 'error' ? (
                    <div className="mt-3 rounded-xl border border-red-200 bg-red-50/40 p-3 text-xs">
                        <div className="flex gap-2 text-red-700">
                            <AlertTriangle size={14} className="shrink-0 mt-0.5 animate-bounce" />
                            <div>
                                <p className="font-bold">Delivery Quote Failed</p>
                                <p className="mt-0.5 text-red-600">Unable to calculate shipping. Please verify your address or connection and try again.</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => setQuoteRetryNonce((current) => current + 1)}
                            className="mt-2.5 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-center text-xs font-bold text-red-700 hover:bg-red-50 transition-colors shadow-sm"
                        >
                            Retry Quote Calculation
                        </button>
                    </div>
                ) : (
                    <p className="text-center text-[10px] text-gray-400">
                        {shippingMethod === 'Pick Up'
                            ? 'Pickup orders have no shipping charge.'
                            : shippingQuote.status === 'ready'
                                ? 'Shipping fee is already included in the total due now.'
                                : 'Waiting for the delivery quote before enabling checkout.'}
                    </p>
                )}
            </div>
            
            <button
                onClick={submitCheckout}
                disabled={submitDisabled || isPendingArtisan}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-clay-600 py-3.5 text-sm font-bold text-white shadow-md shadow-clay-200 transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
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
            <p className="mt-3 flex items-center justify-center gap-1 text-center text-xs text-gray-400">
                <MessageCircle size={12} />
                Chat opens after ordering
            </p>
        </div>
    );
}
