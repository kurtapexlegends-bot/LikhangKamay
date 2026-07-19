import React from 'react';

const StatCard = ({ title, value, icon: Icon, color }) => (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 flex items-center justify-between shadow-sm transition-all hover:shadow-md w-full h-full">
        <div className="min-w-0">
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest leading-none mb-2 truncate">{title}</p>
            <p className="text-2xl font-black text-stone-900 tracking-tight leading-none truncate">{value}</p>
        </div>
        <div className={`p-3 rounded-xl bg-stone-50 border border-stone-100 ${color} shrink-0`}>
            <Icon size={22} />
        </div>
    </div>
);

export default function ContentSafetyKPIs({ items }) {
    return (
        <div className="relative">
            {/* Visual indicators for mobile scroll/swipe discovery */}
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#FAF9F6]/90 to-transparent pointer-events-none z-10 lg:hidden" />
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
