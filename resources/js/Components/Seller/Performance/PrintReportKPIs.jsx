import React from 'react';
import KPICard from '@/Components/KPICard';
import ArtisanSkeleton from '@/Components/Consumer/ArtisanSkeleton';
import {
    DollarSign,
    TrendingUp,
    Package,
    Star
} from 'lucide-react';

const formatPeso = (value) => {
    const num = Math.round(Number(value || 0));
    if (num < 0) {
        return `-₱${Math.abs(num).toLocaleString()}`;
    }
    return `₱${num.toLocaleString()}`;
};

export default function PrintReportKPIs({
    isLoading,
    metrics = {},
    revenueTrend = [],
    profitTrend = [],
}) {
    return (
        <div className="grid grid-cols-4 gap-3.5 w-full performance-kpis-container">
            {isLoading ? (
                <ArtisanSkeleton variant="stat" count={4} />
            ) : (
                <>
                    <div className="w-full">
                        <KPICard 
                            title="Total Revenue" 
                            value={metrics.total_revenue} 
                            growth={metrics.growth?.revenue} 
                            growthSuffix=" vs last 30 days"
                            trendData={revenueTrend}
                            icon={DollarSign} 
                            bg="bg-clay-50" 
                            color="text-clay-600" 
                            animate={false}
                        />
                    </div>
                    <div className="w-full">
                        <KPICard 
                            title="Gross Profit" 
                            value={metrics.gross_profit} 
                            growth={metrics.growth?.profit} 
                            growthSuffix=" vs last 30 days"
                            trendData={profitTrend}
                            subtitle={`${Number(metrics.profit_margin || 0).toFixed(1)}% profit margin`}
                            icon={TrendingUp} 
                            bg="bg-emerald-50" 
                            color="text-emerald-600" 
                            animate={false}
                        />
                    </div>
                    <div className="w-full">
                        <KPICard 
                            title="Completed Orders" 
                            value={metrics.orders_count ?? 0} 
                            growth={metrics.growth?.orders} 
                            growthSuffix=" vs last 30 days"
                            subtitle={metrics.avg_order_value ? `${formatPeso(metrics.avg_order_value)} avg order` : 'Store sales'}
                            icon={Package} 
                            bg="bg-stone-50" 
                            color="text-stone-700" 
                            animate={false} 
                        />
                    </div>
                    <div className="w-full">
                        <KPICard 
                            title="Shop Reputation" 
                            value={`${Number(metrics.average_rating || 0).toFixed(1)} / 5.0`} 
                            growth={metrics.growth?.rating} 
                            growthSuffix=" vs last 30 days"
                            subtitle={`${metrics.review_stats?.total || 0} reviews • ${metrics.follower_metrics?.total ?? 0} followers`}
                            icon={Star} 
                            bg="bg-amber-50" 
                            color="text-amber-600" 
                            formatter={(v) => typeof v === 'number' ? v.toFixed(1) : v} 
                            animate={false} 
                        />
                    </div>
                </>
            )}
        </div>
    );
}
