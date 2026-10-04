import React from 'react';
import { CreditCard, Info } from 'lucide-react';

export default function PaymentMethodSelector({ paymentMethod, setPaymentMethod, shippingMethod, errors }) {
    const isPickUp = shippingMethod === 'Pick Up';

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-clay-700">
                <CreditCard size={15} />
                <h2 className="text-sm font-bold text-stone-900">Payment Method</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
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
                <label className={`relative flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all ${
                    isPickUp 
                        ? 'cursor-not-allowed border-stone-100 bg-stone-50/40 opacity-60' 
                        : paymentMethod === 'GCash' 
                            ? 'border-blue-500 bg-blue-50/25 ring-1 ring-blue-500 shadow-2xs' 
                            : 'border-stone-200 bg-white hover:border-blue-300'
                }`}>
                    <input 
                        type="radio" 
                        name="payment" 
                        value="GCash" 
                        checked={paymentMethod === 'GCash'} 
                        onChange={() => !isPickUp && setPaymentMethod('GCash')} 
                        disabled={isPickUp} 
                        className="mt-0.5 h-4 w-4 text-blue-600 border-stone-300 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50" 
                    />
                    <div className="min-w-0">
                        <p className="font-bold text-stone-900 text-xs sm:text-[13px]">GCash</p>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">
                            {isPickUp ? 'Unavailable for workshop pickup' : 'Instant mobile e-wallet payment.'}
                        </p>
                    </div>
                </label>
            </div>

            {isPickUp && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50/70 border border-amber-200/70 px-3 py-1.5 text-[11px] text-amber-900">
                    <Info size={13} className="shrink-0 text-amber-700" />
                    <span>Workshop pick up orders are settled directly via Cash on Delivery.</span>
                </div>
            )}
            
            {errors.payment_method && <p className="mt-1 text-xs text-red-500">{errors.payment_method}</p>}
        </div>
    );
}
