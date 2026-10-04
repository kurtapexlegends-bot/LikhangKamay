import React from 'react';
import { Truck } from 'lucide-react';

export default function ShippingMethodSelector({ shippingMethod, setShippingMethod }) {
    const handleMethodChange = (value) => {
        if (value === 'Pick Up') {
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
                
                <label className={`relative flex cursor-pointer items-start gap-2.5 rounded-xl border p-2.5 sm:p-3 transition-all ${
                    shippingMethod === 'Pick Up' 
                        ? 'border-clay-600 bg-clay-50/25 ring-1 ring-clay-600 shadow-2xs' 
                        : 'border-stone-200 bg-white hover:border-clay-300'
                }`}>
                    <input 
                        type="radio" 
                        name="shipping_method" 
                        value="Pick Up" 
                        checked={shippingMethod === 'Pick Up'} 
                        onChange={() => handleMethodChange('Pick Up')} 
                        className="mt-0.5 h-4 w-4 text-clay-600 border-stone-300 focus:ring-clay-500 focus:ring-offset-0" 
                    />
                    <div className="min-w-0">
                        <p className="font-bold text-stone-900 text-xs sm:text-[13px]">Store Pick Up</p>
                        <p className="text-[11px] text-stone-500 mt-0.5 leading-snug">Collect directly at artisan workshop · No fees.</p>
                    </div>
                </label>
            </div>
        </div>
    );
}
