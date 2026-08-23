import React from 'react';
import { Award, Clock, TrendingUp, Store } from 'lucide-react';
import KPICard from '@/Components/KPICard';

export default function CatalogKPIs({ totalRequests, pendingRequests, approvedRequests, uniqueShops }) {
    return (
        <div className="flex overflow-x-auto gap-4 sm:gap-5 pb-2.5 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                <KPICard
                    title="Total Requests"
                    value={totalRequests}
                    subtitle="Across the current listing"
                    icon={Award}
                    bg="bg-amber-50"
                    color="text-amber-700"
                />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                <KPICard
                    title="Pending Review"
                    value={pendingRequests}
                    subtitle="Need admin action"
                    icon={Clock}
                    bg="bg-stone-100"
                    color="text-stone-700"
                />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                <KPICard
                    title="Approved"
                    value={approvedRequests}
                    subtitle="Active campaign boosts"
                    icon={TrendingUp}
                    bg="bg-emerald-50"
                    color="text-emerald-700"
                />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                <KPICard
                    title="Active Sellers"
                    value={uniqueShops}
                    subtitle="Unique shops requesting"
                    icon={Store}
                    bg="bg-clay-50"
                    color="text-clay-700"
                />
            </div>
        </div>
    );
}

