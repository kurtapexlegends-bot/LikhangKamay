import React from 'react';
import { DollarSign, ShoppingBag, Users, CreditCard } from 'lucide-react';
import ArtisanSkeleton from '@/Components/Consumer/ArtisanSkeleton';
import KPICard from '@/Components/KPICard';

export default function DashboardKPIs({ metrics, isLoading, shouldAnimateKPI }) {
    return (
        <div className="flex overflow-x-auto pb-2.5 gap-6 flex-nowrap snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            {isLoading ? (
                <ArtisanSkeleton variant="stat" count={4} />
            ) : (
                <>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                        <KPICard 
                            title="Total Revenue" 
                            value={metrics.revenue} 
                            growth={metrics.revenue_growth} 
                            growthSuffix=" vs last 30 days"
                            icon={DollarSign} 
                            bg="bg-emerald-50" 
                            color="text-emerald-600" 
                            animate={shouldAnimateKPI}
                        />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                        <KPICard 
                            title="Total Orders" 
                            value={metrics.orders} 
                            growth={metrics.orders_growth} 
                            growthSuffix=" vs last 30 days"
                            icon={ShoppingBag} 
                            bg="bg-clay-50" 
                            color="text-clay-600" 
                            animate={shouldAnimateKPI}
                        />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                        <KPICard 
                            title="Total Customers" 
                            value={metrics.customers} 
                            growth={metrics.customers_growth} 
                            growthSuffix=" vs last 30 days"
                            icon={Users} 
                            bg="bg-rose-50" 
                            color="text-rose-600" 
                            animate={shouldAnimateKPI}
                        />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                        <KPICard 
                            title="Avg. Order Value" 
                            value={metrics.avg_value} 
                            growth={metrics.avg_growth} 
                            growthSuffix=" vs last 30 days"
                            icon={CreditCard} 
                            bg="bg-stone-100" 
                            color="text-stone-600" 
                            animate={shouldAnimateKPI}
                        />
                    </div>
                </>
            )}
        </div>
    );
}
