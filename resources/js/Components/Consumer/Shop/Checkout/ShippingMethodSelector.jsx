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
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-3 text-stone-700">
                <div className="rounded-xl bg-stone-50 p-2 text-stone-500"><Truck size={18} /></div>
                <div>
                    <h2 className="text-sm font-bold text-stone-900">Shipping Method</h2>
                    <p className="text-[10px] text-stone-400 font-semibold uppercase tracking-wider">Select delivery preference</p>
                </div>
            </div>
            
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <label className={`relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    shippingMethod === 'Delivery' 
                        ? 'border-clay-600 bg-clay-50/30 ring-4 ring-clay-600/5 shadow-sm' 
                        : 'border-stone-200 bg-white hover:border-clay-300 hover:bg-stone-50/10'
                }`}>
                    <input 
                        type="radio" 
                        name="shipping_method" 
                        value="Delivery" 
                        checked={shippingMethod === 'Delivery'} 
                        onChange={() => handleMethodChange('Delivery')} 
                        className="mt-1 h-4.5 w-4.5 text-clay-600 border-stone-300 focus:ring-clay-500 focus:ring-offset-0" 
                    />
                    <div>
                        <p className="font-bold text-stone-900 text-sm">Standard Delivery</p>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">Convenience fee applies per seller order subtotal.</p>
                    </div>
                </label>
                
                <label className={`relative flex cursor-pointer items-start gap-3.5 rounded-xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md ${
                    shippingMethod === 'Pick Up' 
                        ? 'border-clay-600 bg-clay-50/30 ring-4 ring-clay-600/5 shadow-sm' 
                        : 'border-stone-200 bg-white hover:border-clay-300 hover:bg-stone-50/10'
                }`}>
                    <input 
                        type="radio" 
                        name="shipping_method" 
                        value="Pick Up" 
                        checked={shippingMethod === 'Pick Up'} 
                        onChange={() => handleMethodChange('Pick Up')} 
                        className="mt-1 h-4.5 w-4.5 text-clay-600 border-stone-300 focus:ring-clay-500 focus:ring-offset-0" 
                    />
                    <div>
                        <p className="font-bold text-stone-900 text-sm">Store Pick Up</p>
                        <p className="text-xs text-stone-500 mt-1 leading-relaxed">No convenience fee. COD only. Coordinate physical pickup details directly.</p>
                    </div>
                </label>
            </div>
        </div>
    );
}
