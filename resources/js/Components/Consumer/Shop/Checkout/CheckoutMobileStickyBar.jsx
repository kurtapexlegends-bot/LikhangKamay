import React, { useState } from 'react';
import { ChevronUp, ShieldCheck } from 'lucide-react';
import StickyActionBar from '@/Components/StickyActionBar';
import SlideOverDrawer from '@/Components/SlideOverDrawer';
import OrderPricingSummary from '@/Components/Consumer/Shop/Checkout/OrderPricingSummary';

const peso = (value) => `PHP ${Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function CheckoutMobileStickyBar({
    summary,
    shippingQuote,
    shippingMethod,
    totalSellers,
    submitDisabled,
    isPendingArtisan,
    processing,
    submitCheckout,
    convenienceFeeRate,
    showAggregateBreakdown,
    setQuoteRetryNonce,
    handleUpdateQty,
    handleRemoveItem,
    updatingItemId,
    removingItemId,
}) {
    const [showMobileSummary, setShowMobileSummary] = useState(false);

    return (
        <>
            {/* Mobile Sticky Bar */}
            <div className="md:hidden">
                <StickyActionBar>
                    <div className="min-w-0 flex-1 cursor-pointer group" onClick={() => setShowMobileSummary(true)}>
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-stone-400 flex items-center gap-1">
                            Total Due <ChevronUp size={10} className="shrink-0 text-stone-400 transition group-hover:text-clay-600" />
                        </p>
                        <p className="text-sm font-bold text-gray-900">{peso(summary.grandTotal)}</p>
                        <p className="text-[11px] text-stone-500">
                            {processing
                                ? 'Submitting order...'
                                : submitDisabled && shippingMethod === 'Delivery' && shippingQuote.status !== 'ready'
                                    ? 'Delivery quote still needed'
                                    : totalSellers > 1
                                        ? `${totalSellers} split orders`
                                        : 'Tap to view details'}
                        </p>
                    </div>
                    <button
                        onClick={submitCheckout}
                        disabled={submitDisabled || isPendingArtisan}
                        className="flex h-11 flex-[1.2] items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 text-sm font-bold text-white shadow-sm shadow-clay-200 transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
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
                                <span>Place Order</span>
                            </>
                        )}
                    </button>
                </StickyActionBar>
            </div>

            {/* Mobile Summary Drawer */}
            <SlideOverDrawer
                show={showMobileSummary}
                onClose={() => setShowMobileSummary(false)}
                title="Order Summary"
                position="bottom"
                widthClass="max-w-xl"
                footer={
                    <button
                        onClick={(event) => {
                            setShowMobileSummary(false);
                            submitCheckout(event);
                        }}
                        disabled={submitDisabled || isPendingArtisan}
                        className="flex w-full h-11 items-center justify-center gap-2 rounded-xl bg-clay-600 px-4 text-sm font-bold text-white shadow-sm transition hover:bg-clay-700 disabled:cursor-not-allowed disabled:opacity-50 active:scale-95"
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
                }
            >
                <div className="space-y-4">
                    <OrderPricingSummary 
                        summary={summary}
                        shippingQuote={shippingQuote}
                        shippingMethod={shippingMethod}
                        convenienceFeeRate={convenienceFeeRate}
                        showAggregateBreakdown={showAggregateBreakdown}
                        totalSellers={totalSellers}
                        submitDisabled={submitDisabled}
                        isPendingArtisan={isPendingArtisan}
                        processing={processing}
                        submitCheckout={submitCheckout}
                        setQuoteRetryNonce={setQuoteRetryNonce}
                        hideSubmitButton={true}
                        hideTitle={true}
                        flat={true}
                        onUpdateQty={handleUpdateQty}
                        onRemoveItem={handleRemoveItem}
                        updatingItemId={updatingItemId}
                        removingItemId={removingItemId}
                    />
                </div>
            </SlideOverDrawer>
        </>
    );
}
