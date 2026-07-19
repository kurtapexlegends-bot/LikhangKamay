import React, { useState, useMemo } from 'react';
import KPICard from '@/Components/KPICard';
import StaggerContainer from '@/Components/StaggerContainer';
import ContentTransition from '@/Components/ContentTransition';
import WorkspaceEmptyState from '@/Components/WorkspaceEmptyState';
import ArtisanSkeleton from '@/Components/Consumer/ArtisanSkeleton';
import {
    Package,
    Activity,
    DollarSign,
    TrendingUp,
    Star
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';

const COLORS = ['#c07251', '#d97706', '#059669', '#57534e', '#e11d48', '#8c5a44'];

const pesoFormatter = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
});

const formatPeso = (value) => pesoFormatter.format(Number(value || 0));

export default function OverviewTab({
    isLoading,
    metrics,
    revenueTrend,
    revenueBreakdown,
    profitTrend,
    shouldAnimateKPI,
    chartFilter,
    setChartFilter,
    currentChartData,
    categoryData,
    updateCategoryFilter,
}) {
    const pieData = useMemo(() => {
        if (!categoryData) return [];
        const active = categoryData.filter(c => Number(c.value || 0) > 0);
        if (active.length > 0) return active;
        return [{ category: 'No Sales', value: 1, isEmpty: true }];
    }, [categoryData]);
    const [activeCardIndex, setActiveCardIndex] = useState(0);

    const handleCardScroll = (e) => {
        const scrollLeft = e.currentTarget.scrollLeft;
        const width = e.currentTarget.getBoundingClientRect().width;
        if (width > 0) {
            const index = Math.round(scrollLeft / width);
            setActiveCardIndex(index);
        }
    };

    return (
        <div className="space-y-6">
            {/* Level 1: Key Performance Indicators */}
            <div className="space-y-2">
                <StaggerContainer 
                    onScroll={handleCardScroll}
                    className="flex overflow-x-auto pb-2.5 gap-6 flex-nowrap snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-4 no-scrollbar -mx-4 px-4 md:mx-0 md:px-0"
                >
                    {isLoading ? (
                        <ArtisanSkeleton variant="stat" count={4} />
                    ) : (
                        <>
                            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
                                <KPICard 
                                    title="Total Revenue" 
                                    value={metrics.total_revenue} 
                                    growth={metrics.growth?.revenue} 
                                    growthSuffix=" vs last 30 days"
                                    trendData={revenueTrend}
                                    breakdown={Object.keys(revenueBreakdown || {}).length > 0 ? revenueBreakdown : null}
                                    icon={DollarSign} 
                                    bg="bg-stone-50" 
                                    color="text-clay-600" 
                                    animate={shouldAnimateKPI}
                                />
                            </div>
                            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
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
                            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
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
                            <div className="w-[85vw] max-w-[280px] shrink-0 snap-center md:w-auto">
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

                {/* Page Indicator Dots on Mobile */}
                <div className="flex justify-center gap-1.5 mt-1 sm:hidden">
                    {[0, 1, 2, 3].map((i) => (
                        <span
                            key={i}
                            className={`h-1 rounded-full transition-all duration-300 ${
                                activeCardIndex === i ? 'w-3.5 bg-orange-600' : 'w-1 bg-stone-200'
                            }`}
                        />
                    ))}
                </div>
            </div>

            {/* Level 2: Financial Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="min-w-0 lg:col-span-2 bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col relative overflow-hidden">
                    <ContentTransition
                        isShowingPlaceholder={isLoading}
                        placeholder={
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex items-center justify-center">
                                <div className="h-full w-full relative overflow-hidden bg-stone-50/30">
                                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"></div>
                                </div>
                            </div>
                        }
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-stone-900 flex items-center gap-2">
                                    <span>Revenue Analytics</span>
                                </h3>
                                <p className="text-sm text-stone-500">Income over time</p>
                            </div>
                            <div className="flex w-full sm:w-auto bg-stone-100 p-1 rounded-lg">
                                {['Monthly', 'Yearly'].map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setChartFilter(filter)}
                                        className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${chartFilter === filter ? 'bg-white text-clay-700 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="h-64 min-h-[250px] w-full min-w-0">
                            {currentChartData.length > 0 ? (
                                <div className="h-full w-full">
                                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                                        <AreaChart data={currentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                                            <defs>
                                                <linearGradient id="colorRevenueScreen" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#c07251" stopOpacity={0.15} />
                                                    <stop offset="95%" stopColor="#c07251" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f4" />
                                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} dy={10} />
                                            <YAxis width={40} axisLine={false} tickLine={false} tick={{ fill: '#a8a29e', fontSize: 12 }} tickFormatter={(val) => formatPeso(val)} />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                formatter={(value) => formatPeso(value)}
                                                cursor={{ stroke: '#c07251', strokeWidth: 1, strokeDasharray: '4 4' }}
                                            />
                                            <Area type="monotone" dataKey="value" stroke="#c07251" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenueScreen)" dot={{ r: 4, fill: '#c07251', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-full">
                                    <WorkspaceEmptyState
                                        compact
                                        icon={DollarSign}
                                        title="No revenue data yet"
                                        description="Completed orders for this filter will appear here once your shop starts converting sales."
                                        actionLabel="View Orders"
                                        actionHref={route('orders.index')}
                                    />
                                </div>
                            )}
                        </div>
                    </ContentTransition>
                </div>

                <div className="min-w-0 bg-white p-5 rounded-2xl shadow-sm border border-stone-100 flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-stone-900">Sales by Category</h3>
                        <p className="text-sm text-stone-500 mb-4">Total items sold</p>
                    </div>

                    {categoryData.length > 0 ? (
                        <div className="h-[180px] w-full flex items-center justify-center relative">
                            {/* Screen Pie Chart (Animated) */}
                            <div className="print:hidden">
                                <PieChart width={160} height={160}>
                                    <Pie
                                        data={pieData}
                                        nameKey="category"
                                        cx={80}
                                        cy={80}
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={pieData.length > 1 ? 4 : 0}
                                        dataKey="value"
                                        stroke="none"
                                        onClick={(data) => updateCategoryFilter(data.category || data.name)}
                                        className="cursor-pointer"
                                    >
                                        {pieData.map((entry, index) => {
                                            const originalIndex = categoryData.findIndex(c => c.category === entry.category);
                                            const sliceColor = entry.isEmpty ? '#e7e5e4' : COLORS[originalIndex % COLORS.length];
                                            return (
                                                <Cell key={`cell-${index}`} fill={sliceColor} />
                                            );
                                        })}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 600 }}
                                        formatter={(value, name) => [`${value} items`, name]}
                                    />
                                </PieChart>
                            </div>

                            {/* Print Pie Chart (Instant / Static) */}
                            <div className="hidden print:block">
                                <PieChart width={160} height={160}>
                                    <Pie
                                        data={pieData}
                                        nameKey="category"
                                        cx={80}
                                        cy={80}
                                        innerRadius={45}
                                        outerRadius={70}
                                        paddingAngle={pieData.length > 1 ? 4 : 0}
                                        dataKey="value"
                                        stroke="none"
                                        isAnimationActive={false}
                                    >
                                        {pieData.map((entry, index) => {
                                            const originalIndex = categoryData.findIndex(c => c.category === entry.category);
                                            const sliceColor = entry.isEmpty ? '#e7e5e4' : COLORS[originalIndex % COLORS.length];
                                            return (
                                                <Cell key={`cell-${index}`} fill={sliceColor} />
                                            );
                                        })}
                                    </Pie>
                                </PieChart>
                            </div>
                        </div>
                    ) : (
                        <WorkspaceEmptyState
                            compact
                            icon={Package}
                            title="No category sales yet"
                            description="Category performance becomes available after your first completed orders."
                            actionLabel="Manage Products"
                            actionHref={route('products.index')}
                        />
                    )}

                    {categoryData.length > 0 && (
                        <div className="mt-4 space-y-2 pt-3 border-t border-stone-100 max-h-[140px] overflow-y-auto pr-1">
                            {(() => {
                                const total = categoryData.reduce((sum, item) => sum + item.value, 0);
                                return categoryData.map((item, index) => (
                                    <div key={index} className="flex flex-col gap-0.5">
                                        <div className="flex items-center justify-between text-[11px]">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                <span className="font-bold text-stone-900 truncate max-w-[120px]">{item.category || item.name}</span>
                                            </div>
                                            <span className="font-black text-clay-700">{formatPeso(item.profit)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[10px] text-stone-400">
                                            <span>{item.value} sold • {item.margin}% margin</span>
                                            <span className="font-bold">{total > 0 ? Math.round((item.value / total) * 100) : 0}% share</span>
                                        </div>
                                    </div>
                                ));
                            })()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
