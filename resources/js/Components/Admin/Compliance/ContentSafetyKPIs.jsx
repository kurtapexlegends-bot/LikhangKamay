import React from 'react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-2xl border border-clay-100 p-6 flex items-center gap-4 shadow-sm transition-all hover:shadow-md w-full h-full">
        <div className={`p-3 rounded-xl bg-stone-50 border border-stone-100 ${color} shrink-0`}>
            <Icon size={24} />
        </div>
        <div className="min-w-0">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-1 truncate">{title}</p>
            <p className="text-2xl font-black text-stone-900 tracking-tight leading-none truncate">{value}</p>
        </div>
    </div>
);

export default function ContentSafetyKPIs({ items }) {
    return (
        <div className="flex overflow-x-auto lg:grid lg:grid-cols-4 gap-4 pb-4 lg:pb-0 scrollbar-hide snap-x snap-mandatory flex-nowrap lg:flex-wrap -mx-4 px-4 sm:-mx-0 sm:px-0">
            {items.map((item, idx) => (
                <div key={idx} className="w-[75vw] sm:w-[45vw] lg:w-auto shrink-0 snap-center">
                    <StatCard {...item} />
                </div>
            ))}
        </div>
    );
}
