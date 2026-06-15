import React from 'react';
import { ClipboardList, Timer, Truck, CheckCircle } from 'lucide-react';

export default function StockRequestMetrics({ requests }) {
    const getCount = (status) => {
        if (status === 'all') return requests.length;
        if (status === 'pending') return requests.filter(r => r.status === 'pending').length;
        return requests.filter(r => r.status === status).length;
    };

    const kpiCards = [
        { label: 'Total Requests', value: requests.length, icon: ClipboardList, color: 'text-stone-600', bg: 'bg-stone-50' },
        { label: 'Pending', value: getCount('pending'), icon: Timer, color: 'text-amber-500', bg: 'bg-amber-50' },
        { label: 'In Process', value: getCount('ordered') + getCount('partially_received'), icon: Truck, color: 'text-[#C8A08A]', bg: 'bg-[#FBF1E8]' },
        { label: 'Completed', value: getCount('completed'), icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    ];

    return (
        <div className="flex overflow-x-auto pb-2.5 gap-4 flex-nowrap snap-x snap-mandatory lg:grid lg:grid-cols-4 no-scrollbar -mx-4 px-4 lg:mx-0 lg:px-0">
            {kpiCards.map((card, i) => (
                <div key={i} className="w-[85vw] max-w-[280px] shrink-0 snap-center lg:w-auto bg-white p-5 rounded-2xl border border-stone-200/60 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
                    <div>
                        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{card.label}</p>
                        <h3 className="text-2xl font-bold text-stone-900 mt-1.5">{card.value}</h3>
                    </div>
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${card.bg} ${card.color}`}>
                        <card.icon size={22} strokeWidth={2.5} />
                    </div>
                </div>
            ))}
        </div>
    );
}
