import React from 'react';

const StatCard = ({ title, value, icon: Icon, color, subtitle, bg = 'bg-stone-50' }) => (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 flex items-center justify-between shadow-2xs transition-all hover:shadow-sm w-full h-full">
        <div className="min-w-0 flex-1 pr-3">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-2 truncate">{title}</p>
            <p className="text-2xl font-black text-stone-900 tracking-tight leading-none truncate">{value}</p>
            {subtitle && (
                <p className="text-[11px] font-medium text-stone-500 mt-2 truncate">{subtitle}</p>
            )}
        </div>
        <div className={`p-3 rounded-xl ${bg} border border-stone-100 ${color} shrink-0`}>
            <Icon size={20} />
        </div>
    </div>
);

export default function ContentSafetyKPIs({ items = [] }) {
    if (!items || items.length === 0) return null;

    return (
        <div className="relative">
            {/* Visual fade indicators for mobile swipe discovery */}
            <div className="absolute right-0 top-0 bottom-4 w-8 bg-gradient-to-l from-stone-100/80 to-transparent pointer-events-none z-10 lg:hidden" />
            <div className="flex overflow-x-auto lg:grid lg:grid-cols-4 gap-4 pb-4 lg:pb-0 scrollbar-hide snap-x snap-mandatory flex-nowrap lg:flex-wrap -mx-4 px-4 sm:-mx-0 sm:px-0">
                {items.map((item, idx) => (
                    <div key={idx} className="w-[75vw] sm:w-[45vw] lg:w-auto shrink-0 snap-center">
                        <StatCard {...item} />
                    </div>
                ))}
            </div>
        </div>
    );
}

