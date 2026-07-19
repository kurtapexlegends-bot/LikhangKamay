import React from 'react';
import StaggerContainer from '@/Components/StaggerContainer';
import ArtisanSkeleton from '@/Components/Consumer/ArtisanSkeleton';
import KPICard from '@/Components/KPICard';
import {
    DollarSign,
    TrendingUp,
    Activity,
    Star
} from 'lucide-react';

export default function PrintReportKPIs({
    isLoading,
    metrics = {},
    revenueTrend = [],
    profitTrend = [],
    revenueBreakdown = null,
    shouldAnimateKPI
}) {
    return (
        <StaggerContainer className="flex overflow-x-auto pb-2.5 gap-4 flex-nowrap snap-x snap-mandatory sm:grid sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 performance-kpis-container">
            {isLoading ? (
                <ArtisanSkeleton variant="stat" count={4} />
            ) : (
                <>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                        <KPICard 
                            title="Total Revenue" 
                            value={metrics.total_revenue} 
                            growth={metrics.growth?.revenue} 
                            growthSuffix=" vs last 30 days"
                            trendData={revenueTrend}
                            breakdown={revenueBreakdown && Object.keys(revenueBreakdown || {}).length > 0 ? revenueBreakdown : null}
                            icon={DollarSign} 
                            bg="bg-stone-50" 
                            color="text-clay-600" 
                            animate={shouldAnimateKPI}
                        />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                        <KPICard 
                            title="Gross Profit" 
                            value={metrics.gross_profit} 
                            growth={metrics.growth?.profit} 
                            growthSuffix=" vs last 30 days"
                            trendData={profitTrend}
                            icon={TrendingUp} 
                            bg="bg-emerald-50" 
                            color="text-emerald-600" 
                            animate={shouldAnimateKPI}
                        />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                        <KPICard 
                            title="Profit Margin" 
                            value={`${Number(metrics.profit_margin || 0).toFixed(1)}%`} 
                            growth={metrics.growth?.margin} 
                            growthSuffix=" vs last 30 days"
                            icon={Activity} 
                            bg="bg-emerald-50" 
                            color="text-emerald-600" 
                            animate={shouldAnimateKPI} 
                        />
                    </div>
                    <div className="w-[85vw] max-w-[280px] shrink-0 snap-center sm:w-auto">
                        <KPICard 
                            title="Shop Rating" 
                            value={`${metrics.average_rating} / 5.0`} 
                            growth={metrics.growth?.rating} 
                            growthSuffix=" vs last 30 days"
                            icon={Star} 
                            bg="bg-amber-50" 
                            color="text-amber-600" 
                            formatter={(v) => v.toFixed(1)} 
                            animate={shouldAnimateKPI} 
                        />
                    </div>
                </>
            )}
        </StaggerContainer>
    );
}
