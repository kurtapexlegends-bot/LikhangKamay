import React from 'react';
import { CreditCard, Info } from 'lucide-react';

export default function PaymentMethodSelector({ paymentMethod, setPaymentMethod, shippingMethod, errors }) {
    const isPickUp = shippingMethod === 'Pick Up';

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-stone-700">
                <div className="rounded-xl bg-stone-50 p-2 text-stone-500"><CreditCard size={18} /></div>
                <div>
                    <h2 className="text-sm font-bold text-stone-900">Payment Method</h2>
                    <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Select payment option</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {/* Cash on Delivery */}
                <label className={`relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    paymentMethod === 'COD' 
                        ? 'border-clay-600 bg-clay-50/30 ring-4 ring-clay-600/5 shadow-sm' 
                        : 'border-stone-200 bg-white hover:border-clay-300 hover:bg-stone-50/10'
                }`}>
                    <input 
                        type="radio" 
                        name="payment" 
                        value="COD" 
                        checked={paymentMethod === 'COD'} 
                        onChange={() => setPaymentMethod('COD')} 
                        className="mt-1 h-4.5 w-4.5 text-clay-600 border-stone-300 focus:ring-clay-500 focus:ring-offset-0" 
                    />
                    <div>
                        <p className="font-bold text-stone-900 text-sm">Cash on Delivery</p>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">Settle your payment in cash upon delivery or pickup.</p>
                    </div>
                </label>

                {/* GCash */}
                <label className={`relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-300 ${
                    isPickUp 
                        ? 'cursor-not-allowed border-stone-100 bg-stone-50/30 opacity-50' 
                        : `hover:-translate-y-0.5 hover:shadow-md ${
                            paymentMethod === 'GCash' 
                                ? 'border-blue-500 bg-blue-50/30 ring-4 ring-blue-500/5 shadow-sm' 
                                : 'border-stone-200 bg-white hover:border-blue-300 hover:bg-stone-50/10'
                        }`
                }`}>
                    <input 
                        type="radio" 
                        name="payment" 
                        value="GCash" 
                        checked={paymentMethod === 'GCash'} 
                        onChange={() => !isPickUp && setPaymentMethod('GCash')} 
                        disabled={isPickUp} 
                        className="mt-1 h-4.5 w-4.5 text-blue-600 border-stone-300 focus:ring-blue-500 focus:ring-offset-0 disabled:opacity-50" 
                    />
                    <div>
                        <p className="font-bold text-stone-900 text-sm">GCash</p>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                            {isPickUp ? 'Unavailable for Store Pick Up' : 'Secure instant mobile wallet payment.'}
                        </p>
                    </div>
                </label>
            </div>

            {isPickUp && (
                <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs leading-relaxed text-amber-800 animate-fadeIn">
                    <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                    <div>
                        <span className="font-bold text-amber-900">GCash is unavailable for Store Pick Up.</span>
                        <p className="mt-0.5 text-amber-700">Pick up orders must be settled via Cash on Delivery (COD) directly at the artisan's physical location during pickup.</p>
                    </div>
                </div>
            )}
            
            {errors.payment_method && <p className="mt-2 text-sm text-red-500">{errors.payment_method}</p>}
        </div>
    );
}
