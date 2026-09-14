import React from 'react';
import { Truck, ChevronDown } from 'lucide-react';

export default function OrderDeliveryFilter({
    fulfillmentType = 'all',
    setFulfillmentType,
    className = '',
}) {
    return (
        <div className={className}>
            <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                Fulfillment / Delivery Mode
            </label>
            <div className="relative">
                <select
                    value={fulfillmentType}
                    onChange={(e) => setFulfillmentType(e.target.value)}
                    className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                >
                    <option value="all">All Fulfillment Modes</option>
                    <option value="lalamove">Lalamove Automated Courier</option>
                    <option value="in_house">In-House Fleet / Dedicated Driver</option>
                    <option value="express">Standard Express Shipping</option>
                    <option value="pickup">Self Pickup / Store Collection</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
            </div>
        </div>
    );
}
