import React from 'react';
import { CreditCard, Info } from 'lucide-react';

export default function PaymentMethodSelector({ paymentMethod, setPaymentMethod, shippingMethod, errors }) {
    const isPickUp = shippingMethod === 'Pick Up';

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-3 text-clay-700">
                <CreditCard size={18} />
                <h2 className="text-base font-bold">Payment Method</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {/* Cash on Delivery */}
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${
                    paymentMethod === 'COD' 
                        ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600 shadow-sm' 
                        : 'border-gray-200 hover:border-clay-300'
                }`}>
                    <input 
                        type="radio" 
                        name="payment" 
                        value="COD" 
                        checked={paymentMethod === 'COD'} 
                        onChange={() => setPaymentMethod('COD')} 
                        className="text-clay-600 focus:ring-clay-500" 
                    />
                    <div>
                        <p className="font-bold text-gray-900 text-sm">Cash on Delivery</p>
                        <p className="text-xs text-gray-500 mt-0.5">Pay when you receive</p>
                    </div>
                </label>

                {/* GCash */}
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all duration-300 ${
                    isPickUp 
                        ? 'cursor-not-allowed border-gray-105 bg-gray-50/50 opacity-50' 
                        : `hover:-translate-y-0.5 hover:shadow-sm ${
                            paymentMethod === 'GCash' 
                                ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500 shadow-sm' 
                                : 'border-gray-200 hover:border-blue-300'
                        }`
                }`}>
                    <input 
                        type="radio" 
                        name="payment" 
                        value="GCash" 
                        checked={paymentMethod === 'GCash'} 
                        onChange={() => !isPickUp && setPaymentMethod('GCash')} 
                        disabled={isPickUp} 
                        className="text-blue-600 focus:ring-blue-500 disabled:opacity-50" 
                    />
                    <div>
                        <p className="font-bold text-gray-900 text-sm">GCash</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                            {isPickUp ? 'Not available for pickup' : 'Pay online after order placement'}
                        </p>
                    </div>
                </label>
            </div>

            {isPickUp && (
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50/60 border border-amber-200 p-3 text-xs text-amber-800 animate-fadeIn">
                    <Info size={14} className="shrink-0 mt-0.5 text-amber-600" />
                    <div>
                        <span className="font-bold">GCash is unavailable for Store Pick Up.</span>
                        <p className="mt-0.5 text-amber-700">Pick up orders must be settled via Cash on Delivery (COD) directly at the artisan's physical location.</p>
                    </div>
                </div>
            )}
            
            {errors.payment_method && <p className="mt-2 text-sm text-red-500">{errors.payment_method}</p>}
        </div>
    );
}
