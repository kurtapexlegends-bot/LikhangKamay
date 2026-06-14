import React from 'react';
import KPICard from '@/Components/KPICard';
import { Box, AlertTriangle, TrendingUp } from 'lucide-react';

export default function ProcurementMetrics({ totalItems, lowStockItems, totalValue, shouldAnimateKPI }) {
    return (
        <div className="flex overflow-x-auto pb-2.5 gap-4 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-3 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                <KPICard 
                    title="Total Items"
                    value={totalItems}
                    icon={Box}
                    bg="bg-blue-50"
                    color="text-blue-600"
                    animate={shouldAnimateKPI}
                />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                <KPICard 
                    title="Low Stock Alerts"
                    value={lowStockItems}
                    icon={AlertTriangle}
                    bg={lowStockItems > 0 ? 'bg-red-50' : 'bg-green-50'}
                    color={lowStockItems > 0 ? 'text-red-600' : 'text-green-600'}
                    animate={shouldAnimateKPI}
                />
            </div>
            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                <KPICard 
                    title="Total Value"
                    value={`₱${parseFloat(totalValue).toLocaleString()}`}
                    icon={TrendingUp}
                    bg="bg-emerald-50"
                    color="text-emerald-600"
                    animate={shouldAnimateKPI}
                />
            </div>
        </div>
    );
}
