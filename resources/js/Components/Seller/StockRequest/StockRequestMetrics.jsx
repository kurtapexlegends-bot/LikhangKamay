import React from 'react';
import { ClipboardList, Clock, Truck, CheckCircle2 } from 'lucide-react';

export default function StockRequestMetrics({ requests = [] }) {
    const getCount = (status) => {
        if (status === 'all') return requests.length;
        if (status === 'pending') return requests.filter(r => r.status === 'pending').length;
        if (status === 'in_process') {
            return requests.filter(r => ['accounting_approved', 'ordered', 'partially_received'].includes(r.status)).length;
        }
        if (status === 'completed') return requests.filter(r => r.status === 'completed').length;
        return requests.filter(r => r.status === status).length;
    };

    const kpiCards = [
        { 
            label: 'Total Requests', 
            value: requests.length, 
            icon: ClipboardList, 
            color: 'text-stone-700', 
            bg: 'bg-stone-100/80',
            border: 'border-stone-200/80'
        },
        { 
            label: 'Pending Approval', 
            value: getCount('pending'), 
            icon: Clock, 
            color: 'text-amber-700', 
            bg: 'bg-amber-50',
            border: 'border-amber-200/80'
        },
        { 
            label: 'In Process', 
            value: getCount('in_process'), 
            icon: Truck, 
            color: 'text-clay-700', 
            bg: 'bg-clay-50',
            border: 'border-clay-200/80'
        },
        { 
            label: 'Completed', 
            value: getCount('completed'), 
            icon: CheckCircle2, 
            color: 'text-emerald-700', 
            bg: 'bg-emerald-50',
            border: 'border-emerald-200/80'
        },
    ];

    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
            {kpiCards.map((card, i) => (
                <div 
                    key={i} 
                    className="bg-white p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl border border-stone-200/80 shadow-2xs flex items-center justify-between gap-3 hover:shadow-xs transition-shadow"
                >
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] sm:text-[11px] font-bold text-stone-400 uppercase tracking-wider truncate">{card.label}</p>
                        <h3 className="text-xl sm:text-2xl font-black text-stone-900 mt-1">{card.value}</h3>
                    </div>
                    <div className={`w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl flex items-center justify-center shrink-0 border ${card.bg} ${card.color} ${card.border}`}>
                        <card.icon size={18} className="sm:w-5 sm:h-5" strokeWidth={2.2} />
                    </div>
                </div>
            ))}
        </div>
    );
}
