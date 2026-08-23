import React from 'react';
import KPICard from '@/Components/KPICard';
import { Package, Store, Tag, Layers } from 'lucide-react';

export default function SupplyHubKPIs({ stats = {}, shouldAnimate = true }) {
    const {
        total_materials = 0,
        active_suppliers = 0,
        wholesale_deals = 0,
        my_published_count = 0,
    } = stats;

    return (
        <div className="flex overflow-x-auto pb-2.5 gap-4 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                <KPICard 
                    title="Available Materials"
                    value={total_materials}
                    subtitle="From peer artisan workshops"
                    icon={Package}
                    bg="bg-clay-50"
                    color="text-clay-600"
                    animate={shouldAnimate}
                />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                <KPICard 
                    title="Active Peer Studios"
                    value={active_suppliers}
                    subtitle="Verified local craft harvesters"
                    icon={Store}
                    bg="bg-blue-50"
                    color="text-blue-600"
                    animate={shouldAnimate}
                />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                <KPICard 
                    title="Bulk Discount Deals"
                    value={wholesale_deals}
                    subtitle="Tiered volume savings"
                    icon={Tag}
                    bg="bg-emerald-50"
                    color="text-emerald-600"
                    animate={shouldAnimate}
                />
            </div>
        </div>
    );
}
