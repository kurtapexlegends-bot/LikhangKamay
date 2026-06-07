import React from 'react';
import { Award, Clock, TrendingUp, Store } from 'lucide-react';

const MetricCard = ({ title, value, subtitle, icon: Icon, tone = 'amber' }) => {
    const tones = {
        amber: 'bg-amber-50 text-amber-700 border-amber-100/50',
        emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100/50',
        blue: 'bg-blue-50 text-blue-700 border-blue-100/50',
        stone: 'bg-stone-50 text-stone-705 border-stone-200/50',
    };

    return (
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-sm flex items-start justify-between hover:shadow-md transition-shadow w-[280px] md:w-auto shrink-0 snap-center">
            <div>
                <p className="text-stone-500 text-[10px] font-bold uppercase tracking-wider mb-1">{title}</p>
                <h3 className="text-2xl font-black text-stone-900 tracking-tight">{value}</h3>
                <p className="text-[10px] font-medium text-stone-400 mt-1">{subtitle}</p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${tones[tone] || tones.amber}`}>
                <Icon size={20} />
            </div>
        </div>
    );
};

export default function CatalogKPIs({ totalRequests, pendingRequests, approvedRequests, uniqueShops }) {
    return (
        <div className="flex overflow-x-auto md:grid md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 pb-4 md:pb-0 flex-nowrap no-scrollbar snap-x snap-mandatory">
            <MetricCard
                title="Total Requests"
                value={totalRequests}
                subtitle="Across the current listing"
                icon={Award}
                tone="amber"
            />
            <MetricCard
                title="Pending Review"
                value={pendingRequests}
                subtitle="Need admin action"
                icon={Clock}
                tone="stone"
            />
            <MetricCard
                title="Approved"
                value={approvedRequests}
                subtitle="Already boosted"
                icon={TrendingUp}
                tone="emerald"
            />
            <MetricCard
                title="Active Sellers"
                value={uniqueShops}
                subtitle="Unique shops requesting"
                icon={Store}
                tone="blue"
            />
        </div>
    );
}
