import React from 'react';
import { CreditCard, ChevronDown } from 'lucide-react';

export default function OrderPaymentFilter({
    paymentMethod = 'all',
    setPaymentMethod,
    className = '',
}) {
    return (
        <div className={className}>
            <label className="block text-[11px] font-bold uppercase tracking-[0.14em] text-stone-500 mb-1.5">
                Payment Method
            </label>
            <div className="relative">
                <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="pr-8 text-xs py-2 w-full min-h-[40px] bg-white border border-stone-200 hover:border-stone-300 rounded-xl font-bold text-stone-700 focus:border-clay-500 focus:ring focus:ring-clay-500/10 transition-all cursor-pointer appearance-none px-3"
                >
                    <option value="all">All Payment Methods</option>
                    <option value="paymongo">PayMongo Online (GCash, Maya, Card)</option>
                    <option value="card">Credit / Debit Card</option>
                    <option value="manual">Cash on Delivery / Direct</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={14} />
            </div>
        </div>
    );
}
