import React from 'react';
import KPICard from '@/Components/KPICard';

export default function ContentSafetyKPIs({ items }) {
    return (
        <div className="relative">
            {/* Visual indicators for mobile scroll/swipe discovery */}
            <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#FAF9F6]/90 to-transparent pointer-events-none z-10 lg:hidden" />
            <div className="flex overflow-x-auto lg:grid lg:grid-cols-4 gap-4 pb-4 lg:pb-0 scrollbar-hide snap-x snap-mandatory flex-nowrap lg:flex-wrap -mx-4 px-4 sm:-mx-0 sm:px-0">
                {items.map((item, idx) => (
                    <div key={idx} className="w-[75vw] sm:w-[45vw] lg:w-auto shrink-0 snap-center">
                        <KPICard
                            title={item.title}
                            value={item.value}
                            icon={item.icon}
                            color={item.color}
                            bg="bg-stone-50"
                            animate={false}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
}
