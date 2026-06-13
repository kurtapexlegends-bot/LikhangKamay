import React from 'react';
import { Activity, ExternalLink } from 'lucide-react';
import OrderTimeline from '@/Components/Consumer/Buyer/MyOrders/OrderTimeline';

export default function OrderCardTimeline({ order, isTimelineExpanded, toggleOrderExpansion }) {
    return (
        <div className="border-b border-stone-50">
            <button 
                type="button"
                onClick={toggleOrderExpansion}
                className="flex w-full items-center justify-between bg-white px-4 py-3 sm:hidden min-h-[44px]"
            >
                <div className="flex items-center gap-2">
                    <Activity size={12} className="text-clay-500" />
                    <span className="text-[11px] font-bold text-stone-700">Track Order</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-medium text-stone-400">
                        {isTimelineExpanded ? 'Hide' : 'View'} History
                    </span>
                    <div className={`transition-transform duration-300 ${isTimelineExpanded ? 'rotate-180' : ''}`}>
                        <ExternalLink size={10} className="text-stone-300" />
                    </div>
                </div>
            </button>
            
            <div className={`${isTimelineExpanded ? 'block' : 'hidden'} sm:block`}>
                <OrderTimeline status={order.status} isPickup={order.shipping_method === 'Pick Up'} />
            </div>
        </div>
    );
}
