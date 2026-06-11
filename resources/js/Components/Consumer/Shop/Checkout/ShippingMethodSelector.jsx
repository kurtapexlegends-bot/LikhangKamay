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
        <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
            <div className="mb-3 flex items-center gap-3 text-clay-700">
                <Truck size={18} />
                <h2 className="text-base font-bold">Shipping Method</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${
                    shippingMethod === 'Delivery' 
                        ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600 shadow-sm' 
                        : 'border-gray-200 hover:border-clay-300'
                }`}>
                    <input 
                        type="radio" 
                        name="shipping_method" 
                        value="Delivery" 
                        checked={shippingMethod === 'Delivery'} 
                        onChange={() => handleMethodChange('Delivery')} 
                        className="text-clay-600 focus:ring-clay-500" 
                    />
                    <div>
                        <p className="font-bold text-gray-900 text-sm">Standard Delivery</p>
                        <p className="text-xs text-gray-500 mt-0.5">Convenience fee applies per seller order subtotal.</p>
                    </div>
                </label>
                <label className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-sm ${
                    shippingMethod === 'Pick Up' 
                        ? 'border-clay-600 bg-clay-50 ring-1 ring-clay-600 shadow-sm' 
                        : 'border-gray-200 hover:border-clay-300'
                }`}>
                    <input 
                        type="radio" 
                        name="shipping_method" 
                        value="Pick Up" 
                        checked={shippingMethod === 'Pick Up'} 
                        onChange={() => handleMethodChange('Pick Up')} 
                        className="text-clay-600 focus:ring-clay-500" 
                    />
                    <div>
                        <p className="font-bold text-gray-900 text-sm">Store Pick Up</p>
                        <p className="text-xs text-gray-500 mt-0.5">No convenience fee. COD only.</p>
                    </div>
                </label>
            </div>
        </div>
    );
}
