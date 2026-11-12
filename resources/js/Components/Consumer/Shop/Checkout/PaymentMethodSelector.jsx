import React from 'react';
import { CreditCard, Info } from 'lucide-react';

export default function PaymentMethodSelector({
    paymentMethod,
    setPaymentMethod,
    shippingMethod,
    onlinePaymentDisabled = false,
    errors,
}) {
    const isPickUp = shippingMethod === 'Pick Up';

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-clay-700">
                <CreditCard size={15} />
                <h2 className="text-sm font-bold text-stone-900">Payment Method</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {/* Cash on Delivery */}
                <label className={`relative flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all ${
                    paymentMethod === 'COD' 
                        ? 'border-clay-600 bg-clay-50/25 ring-1 ring-clay-600 shadow-2xs' 
                        : 'border-stone-200 bg-white hover:border-clay-300'
                }`}>
                    <input 
                        type="radio" 
                        name="payment" 
                        value="COD" 
                        checked={paymentMethod === 'COD'} 
                        onChange={() => setPaymentMethod('COD')} 
                        className="mt-0.5 h-4 w-4 text-clay-600 border-stone-300 focus:ring-clay-500 focus:ring-offset-0" 
                    />
                    <div className="min-w-0">
                        <p className="font-bold text-stone-900 text-xs sm:text-[13px]">Cash on Delivery</p>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">Pay upon delivery or workshop pickup.</p>
                    </div>
                </label>

                {/* GCash */}
                <label className={`relative flex items-start gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all ${
                    onlinePaymentDisabled
                        ? 'cursor-not-allowed border-stone-200 bg-stone-50 opacity-55'
                        : paymentMethod === 'GCash' 
                            ? 'cursor-pointer border-blue-500 bg-blue-50/25 ring-1 ring-blue-500 shadow-2xs' 
                            : 'cursor-pointer border-stone-200 bg-white hover:border-blue-300'
                }`}>
                    <input 
                        type="radio" 
                        name="payment" 
                        value="GCash" 
                        disabled={onlinePaymentDisabled}
                        checked={paymentMethod === 'GCash'} 
                        onChange={() => !onlinePaymentDisabled && setPaymentMethod('GCash')} 
                        className="mt-0.5 h-4 w-4 text-blue-600 border-stone-300 focus:ring-blue-500 focus:ring-offset-0 disabled:cursor-not-allowed" 
                    />
                    <div className="min-w-0">
                        <p className="font-bold text-stone-900 text-xs sm:text-[13px]">GCash</p>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                            {onlinePaymentDisabled ? 'Minimum PHP 20.00 per order.' : 'Instant mobile e-wallet payment.'}
                        </p>
                    </div>
                </label>

                {/* Maya */}
                <label className={`relative flex items-start gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all ${
                    onlinePaymentDisabled
                        ? 'cursor-not-allowed border-stone-200 bg-stone-50 opacity-55'
                        : paymentMethod === 'Maya' 
                            ? 'cursor-pointer border-emerald-600 bg-emerald-50/25 ring-1 ring-emerald-600 shadow-2xs' 
                            : 'cursor-pointer border-stone-200 bg-white hover:border-emerald-300'
                }`}>
                    <input 
                        type="radio" 
                        name="payment" 
                        value="Maya" 
                        disabled={onlinePaymentDisabled}
                        checked={paymentMethod === 'Maya'} 
                        onChange={() => !onlinePaymentDisabled && setPaymentMethod('Maya')} 
                        className="mt-0.5 h-4 w-4 text-emerald-600 border-stone-300 focus:ring-emerald-500 focus:ring-offset-0 disabled:cursor-not-allowed" 
                    />
                    <div className="min-w-0">
                        <p className="font-bold text-stone-900 text-xs sm:text-[13px]">Maya</p>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                            {onlinePaymentDisabled ? 'Minimum PHP 20.00 per order.' : 'Direct Maya e-wallet & QR payment.'}
                        </p>
                    </div>
                </label>
            </div>

            {onlinePaymentDisabled && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50/80 border border-amber-200/80 px-3 py-1.5 text-[11px] text-amber-900">
                    <Info size={13} className="shrink-0 text-amber-700" />
                    <span>Online payments (GCash/Maya) require at least PHP 20.00 per order. Cash on Delivery is selected.</span>
                </div>
            )}

            {isPickUp && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 border border-amber-200/70 px-3 py-1.5 text-[11px] text-amber-900">
                    <Info size={13} className="shrink-0 text-amber-700" />
                    <span>Workshop pick up orders can be prepaid online via GCash/Maya or settled via Cash upon pickup.</span>
                </div>
            )}
            
            {errors.payment_method && <p className="mt-1 text-xs text-red-500">{errors.payment_method}</p>}
        </div>
    );
}
