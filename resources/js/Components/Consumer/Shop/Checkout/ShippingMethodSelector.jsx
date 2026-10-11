import React from 'react';
import { Truck } from 'lucide-react';

export default function ShippingMethodSelector({
    shippingMethod,
    setShippingMethod,
    pickupDisabled = false,
    disabledSellers = [],
}) {
    const handleMethodChange = (value) => {
        if (value === 'Pick Up') {
            if (pickupDisabled) return;
            setShippingMethod({
                shipping_method: 'Pick Up',
                payment_method: 'COD'
            });
        } else {
            setShippingMethod({
                shipping_method: 'Delivery'
            });
        }
    };

    return (
        <div className="rounded-2xl border border-stone-200 bg-white p-3.5 sm:p-4 shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-clay-700">
                <Truck size={15} />
                <h2 className="text-sm font-bold text-stone-900">Shipping Method</h2>
            </div>
            
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <label className={`relative flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all ${
                    shippingMethod === 'Delivery' 
                        ? 'border-clay-600 bg-clay-50/25 ring-1 ring-clay-600 shadow-2xs' 
                        : 'border-stone-200 bg-white hover:border-clay-300'
                }`}>
                    <input 
                        type="radio" 
                        name="shipping_method" 
                        value="Delivery" 
                        checked={shippingMethod === 'Delivery'} 
                        onChange={() => handleMethodChange('Delivery')} 
                        className="mt-0.5 h-4 w-4 text-clay-600 border-stone-300 focus:ring-clay-500 focus:ring-offset-0" 
                    />
                    <div className="min-w-0">
                        <p className="font-bold text-stone-900 text-xs sm:text-[13px]">Standard Delivery</p>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">Courier dispatch directly to your address.</p>
                    </div>
                </label>
                
                <label className={`relative flex items-start gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all ${
                    pickupDisabled
                        ? 'cursor-not-allowed border-stone-200 bg-stone-50/70 opacity-60'
                        : shippingMethod === 'Pick Up' 
                            ? 'cursor-pointer border-clay-600 bg-clay-50/25 ring-1 ring-clay-600 shadow-2xs' 
                            : 'cursor-pointer border-stone-200 bg-white hover:border-clay-300'
                }`}>
                    <input 
                        type="radio" 
                        name="shipping_method" 
                        value="Pick Up" 
                        checked={shippingMethod === 'Pick Up' && !pickupDisabled} 
                        disabled={pickupDisabled}
                        onChange={() => handleMethodChange('Pick Up')} 
                        className="mt-0.5 h-4 w-4 text-clay-600 border-stone-300 focus:ring-clay-500 focus:ring-offset-0 disabled:opacity-50" 
                    />
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <p className="font-bold text-stone-900 text-xs sm:text-[13px]">Store Pick Up</p>
                            {pickupDisabled && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                                    Unavailable
                                </span>
                            )}
                        </div>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">Collect directly at artisan workshop · No fees.</p>
                    </div>
                </label>
            </div>

            {pickupDisabled && disabledSellers.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 space-y-1">
                    {disabledSellers.map((seller) => (
                        <p key={seller.sellerId} className="font-semibold leading-relaxed">
                            {seller.shopName} does not offer workshop pick-up. Please switch to Standard Delivery or purchase their items separately.
                        </p>
                    ))}
                </div>
            )}
        </div>
    );
}
